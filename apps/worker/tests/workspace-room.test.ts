// =============================================================================
// FILE:    apps/worker/tests/workspace-room.test.ts
// PURPOSE: Realtime room tests over real workerd: the route's membership/auth
//          gates, the room's event relay, and the presence flow (join, view
//          an idea, leave). Sockets connect straight to the room stub because
//          the room's contract is "the Worker has already gated membership".
// USED BY: `pnpm test`
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { env } from 'cloudflare:test'
import type { ServerRealtimeMessage } from '@ideo/shared'
import { parseServerRealtimeMessage } from '@ideo/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import type { EnvironmentBindings } from '../src/configuration/environment-bindings'
import { notifyWorkspaceRoom } from '../src/realtime/notify-workspace-room'
import {
  createTestApplicationForUser,
  createTestApplicationWithoutIdentity,
  createTestUserRecord,
} from './test-helpers'

// ---- Types ------------------------------------------------------------------

/** Shapes the tests read from JSON responses. */
type WorkspaceCreatedBody = { workspace: { id: string } }

// ---- Constants --------------------------------------------------------------

/** How long a test waits for a realtime message before giving up. */
const MESSAGE_WAIT_MS = 2_000

// ---- Helpers ------------------------------------------------------------------

/** Opens a room socket for one member, bypassing the HTTP gate on purpose. */
async function connectRoomMember(
  workspaceId: string,
  memberUser: ReturnType<typeof createTestUserRecord>,
): Promise<{ memberSocket: WebSocket; receivedMessages: ServerRealtimeMessage[] }> {
  const testEnvironment = env as unknown as EnvironmentBindings
  const roomStub = testEnvironment.WORKSPACE_ROOM.get(
    testEnvironment.WORKSPACE_ROOM.idFromName(workspaceId),
  )

  const upgradeResponse = await roomStub.fetch('https://room.internal/connect', {
    method: 'POST',
    headers: {
      upgrade: 'websocket',
      'x-ideo-user-id': memberUser.id,
      'x-ideo-user-name': encodeURIComponent(memberUser.displayName),
      'x-ideo-user-color': memberUser.avatarColor,
    },
  })
  expect(upgradeResponse.status).toBe(101)

  const memberSocket = upgradeResponse.webSocket
  expect(memberSocket).toBeDefined()

  const receivedMessages: ServerRealtimeMessage[] = []
  memberSocket?.accept()
  memberSocket?.addEventListener('message', (messageEvent) => {
    const parsedMessage = parseServerRealtimeMessage(JSON.parse(String(messageEvent.data)))
    if (parsedMessage !== null) receivedMessages.push(parsedMessage)
  })

  return { memberSocket: memberSocket as WebSocket, receivedMessages }
}

/** Waits until a matching message arrives; undefined on timeout. */
async function waitForReceivedMessage(
  receivedMessages: ServerRealtimeMessage[],
  matchesMessage: (received: ServerRealtimeMessage) => boolean,
): Promise<ServerRealtimeMessage | undefined> {
  const waitStartedAt = Date.now()
  while (Date.now() - waitStartedAt < MESSAGE_WAIT_MS) {
    const matchedMessage = receivedMessages.find(matchesMessage)
    if (matchedMessage !== undefined) return matchedMessage
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 25))
  }
  return undefined
}

/** Creates a workspace for the owner application and returns its id. */
async function createWorkspaceId(
  ownerApplication: ReturnType<typeof createTestApplicationForUser>,
): Promise<string> {
  const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', {
    name: 'Realtime Lab',
  })
  const createdBody = (await createResponse.json()) as WorkspaceCreatedBody
  return createdBody.workspace.id
}

// ---- Tests ------------------------------------------------------------------
describe('the workspace room', () => {
  let ownerApplication: ReturnType<typeof createTestApplicationForUser>
  let outsiderApplication: ReturnType<typeof createTestApplicationForUser>
  let workspaceId: string
  const testEnvironment = env as unknown as EnvironmentBindings

  beforeEach(async () => {
    ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    outsiderApplication = createTestApplicationForUser(createTestUserRecord(1))
    workspaceId = await createWorkspaceId(ownerApplication)
  })

  it('answers 401 without an identity, 404 for non-members, and 426 without an upgrade', async () => {
    const unauthenticatedApplication = createTestApplicationWithoutIdentity()
    const unauthenticatedResponse = await unauthenticatedApplication.fetchAsUser(
      `/ws/workspaces/${workspaceId}/room`,
      'GET',
    )
    expect(unauthenticatedResponse.status).toBe(401)

    // Same 404 as the API's other workspace endpoints: outsiders cannot
    // distinguish "does not exist" from "not a member".
    const outsiderResponse = await outsiderApplication.fetchAsUser(
      `/ws/workspaces/${workspaceId}/room`,
      'GET',
    )
    expect(outsiderResponse.status).toBe(404)

    // A member without the Upgrade header gets a plain "use a WebSocket".
    const plainResponse = await ownerApplication.fetchAsUser(
      `/ws/workspaces/${workspaceId}/room`,
      'GET',
    )
    expect(plainResponse.status).toBe(426)
  })

  it('announces each newcomer to everyone already in the room', async () => {
    const owner = createTestUserRecord(0)
    const member = createTestUserRecord(2)
    await ownerApplication.fetchAsUser(`/api/workspaces/${workspaceId}/invites`, 'POST', {
      maximumUses: 5,
    })

    const ownerRoom = await connectRoomMember(workspaceId, owner)
    const memberRoom = await connectRoomMember(workspaceId, member)

    // The newcomer's first snapshot already contains the owner…
    const newcomerSnapshot = await waitForReceivedMessage(
      memberRoom.receivedMessages,
      (received) =>
        received.type === 'presence_update' &&
        received.viewers.some((viewer) => viewer.userId === owner.id),
    )
    expect(newcomerSnapshot).toBeDefined()

    // …and the owner hears about the member joining.
    const ownerSeesMember = await waitForReceivedMessage(
      ownerRoom.receivedMessages,
      (received) =>
        received.type === 'presence_update' &&
        received.viewers.some((viewer) => viewer.userId === member.id),
    )
    expect(ownerSeesMember).toBeDefined()

    ownerRoom.memberSocket.close()
    memberRoom.memberSocket.close()
  })

  it('tracks which idea each viewer is looking at', async () => {
    const owner = createTestUserRecord(0)
    const ownerRoom = await connectRoomMember(workspaceId, owner)

    const member = createTestUserRecord(2)
    const memberRoom = await connectRoomMember(workspaceId, member)

    memberRoom.memberSocket.send(
      JSON.stringify({ type: 'presence', viewingIdeaId: 'idea-being-read' }),
    )
    const viewingUpdate = await waitForReceivedMessage(
      ownerRoom.receivedMessages,
      (received) =>
        received.type === 'presence_update' &&
        received.viewers.some(
          (viewer) => viewer.userId === member.id && viewer.viewingIdeaId === 'idea-being-read',
        ),
    )
    expect(viewingUpdate).toBeDefined()

    // Leaving (closing the socket) removes the viewer from the snapshot.
    memberRoom.memberSocket.close()
    const leaveUpdate = await waitForReceivedMessage(
      ownerRoom.receivedMessages,
      (received) =>
        received.type === 'presence_update' &&
        !received.viewers.some((viewer) => viewer.userId === member.id),
    )
    expect(leaveUpdate).toBeDefined()

    ownerRoom.memberSocket.close()
  })

  it('relays workspace events from the notify helper to every connected member', async () => {
    const owner = createTestUserRecord(0)
    const ownerRoom = await connectRoomMember(workspaceId, owner)
    const member = createTestUserRecord(2)
    const memberRoom = await connectRoomMember(workspaceId, member)

    await notifyWorkspaceRoom(testEnvironment, workspaceId, {
      type: 'workspace_event',
      eventType: 'idea_voted',
      subjectId: 'idea-9',
    })

    const expectedMessage = (received: ServerRealtimeMessage) =>
      received.type === 'workspace_event' &&
      received.eventType === 'idea_voted' &&
      received.subjectId === 'idea-9'

    const ownerReceived = await waitForReceivedMessage(ownerRoom.receivedMessages, expectedMessage)
    const memberReceived = await waitForReceivedMessage(
      memberRoom.receivedMessages,
      expectedMessage,
    )
    expect(ownerReceived).toBeDefined()
    expect(memberReceived).toBeDefined()

    ownerRoom.memberSocket.close()
    memberRoom.memberSocket.close()
  })
})
