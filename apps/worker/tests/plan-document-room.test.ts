// =============================================================================
// FILE:    apps/worker/tests/plan-document-room.test.ts
// PURPOSE: Collaborative notes tests over real workerd: the route's gates,
//          a real Yjs sync round-trip between two clients, persistence into
//          the room's storage, and the awareness relay. Client-side frames
//          are built with the same yjs/y-protocols libraries the browser uses.
// USED BY: `pnpm test`
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { env } from 'cloudflare:test'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import { beforeEach, describe, expect, it } from 'vitest'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as Y from 'yjs'
import type { EnvironmentBindings } from '../src/configuration/environment-bindings'
import {
  createTestApplicationForUser,
  createTestApplicationWithoutIdentity,
  createTestUserRecord,
} from './test-helpers'

// ---- Types ------------------------------------------------------------------

/** Shapes the tests read from JSON responses. */
type WorkspaceCreatedBody = { workspace: { id: string } }
type IdeaCreatedBody = { idea: { ideaId: string } }
type PlanCreatedBody = { plan: { planId: string } }

/** One decoded y-websocket frame. */
type DecodedFrame = { messageType: number; payload: Uint8Array }
type ServerRealtimeFrame = { type: 'sync' | 'awareness'; payload: Uint8Array }

// ---- Constants --------------------------------------------------------------

/** How long a test waits for a realtime message before giving up. */
const MESSAGE_WAIT_MS = 2_000

const MESSAGE_TYPE_SYNC = 0
const MESSAGE_TYPE_AWARENESS = 1

// ---- Frame helpers -------------------------------------------------------------

/** Frames one sync message: raw content as the tail after the type byte. */
function frameSyncMessage(syncContent: Uint8Array): Uint8Array {
  const framedMessage = new Uint8Array(1 + syncContent.length)
  framedMessage[0] = MESSAGE_TYPE_SYNC
  framedMessage.set(syncContent, 1)
  return framedMessage
}

/** Frames one awareness update: length-prefixed, as y-websocket sends it. */
function frameAwarenessMessage(awarenessUpdate: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder()
  encoding.writeVarUint(encoder, MESSAGE_TYPE_AWARENESS)
  encoding.writeVarUint8Array(encoder, awarenessUpdate)
  return encoding.toUint8Array(encoder)
}

/** Builds the frame a client sends to push its full document state. */
function buildSyncStep2Frame(document: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder()
  syncProtocol.writeUpdate(encoder, Y.encodeStateAsUpdate(document))
  return frameSyncMessage(encoding.toUint8Array(encoder))
}

/** Builds an awareness frame announcing the given awareness instance. */
function buildAwarenessFrame(awareness: awarenessProtocol.Awareness): Uint8Array {
  const update = awarenessProtocol.encodeAwarenessUpdate(awareness, [awareness.clientID])
  return frameAwarenessMessage(update)
}

/** Applies one sync frame received from the room into a client document. */
function applySyncFrameToClientDocument(frame: DecodedFrame, clientDocument: Y.Doc): void {
  const frameDecoder = decoding.createDecoder(frame.payload)
  const replyEncoder = encoding.createEncoder()
  syncProtocol.readSyncMessage(frameDecoder, replyEncoder, clientDocument, 'test-client')
}

/** Narrows a received frame to the sync frames the assertions need. */
function requireSyncFrame(frame: ServerRealtimeFrame | undefined): DecodedFrame {
  if (frame === undefined || frame.type !== 'sync') {
    throw new Error('Expected a sync frame from the room.')
  }
  return { messageType: MESSAGE_TYPE_SYNC, payload: frame.payload }
}

// ---- Connection helpers ---------------------------------------------------------

/** Opens a document room socket for one member, bypassing the HTTP gate. */
async function connectDocumentMember(
  planId: string,
  _memberUser: ReturnType<typeof createTestUserRecord>,
): Promise<{ memberSocket: WebSocket; receivedFrames: ServerRealtimeFrame[] }> {
  const testEnvironment = env as unknown as EnvironmentBindings
  const documentStub = testEnvironment.PLAN_DOCUMENT_ROOM.get(
    testEnvironment.PLAN_DOCUMENT_ROOM.idFromName(planId),
  )

  const upgradeResponse = await documentStub.fetch('https://document.internal/connect', {
    method: 'GET',
    headers: { upgrade: 'websocket' },
  })
  expect(upgradeResponse.status).toBe(101)

  const memberSocket = upgradeResponse.webSocket
  expect(memberSocket).toBeDefined()

  const receivedFrames: ServerRealtimeFrame[] = []
  memberSocket?.accept()
  memberSocket?.addEventListener('message', (messageEvent) => {
    void Promise.resolve(messageEvent.data).then(async (frameData) => {
      // The test pool delivers binary frames as Blobs; production delivers
      // ArrayBuffers. Handle both.
      const frameBuffer =
        frameData instanceof Blob ? await frameData.arrayBuffer() : (frameData as ArrayBuffer)
      const frameBytes = new Uint8Array(frameBuffer)
      const messageType = frameBytes[0]
      receivedFrames.push({
        type: messageType === MESSAGE_TYPE_SYNC ? 'sync' : 'awareness',
        payload: frameBytes.slice(1),
      })
    })
  })

  return { memberSocket: memberSocket as WebSocket, receivedFrames }
}

/** Waits until a matching frame arrives; undefined on timeout. */
async function waitForFrame(
  receivedFrames: ServerRealtimeFrame[],
  matchesFrame: (frame: ServerRealtimeFrame) => boolean,
): Promise<ServerRealtimeFrame | undefined> {
  const waitStartedAt = Date.now()
  while (Date.now() - waitStartedAt < MESSAGE_WAIT_MS) {
    const matchedFrame = receivedFrames.find(matchesFrame)
    if (matchedFrame !== undefined) return matchedFrame
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 25))
  }
  return undefined
}

// ---- Fixtures --------------------------------------------------------------------

/** Creates a workspace, an idea, and a plan from that idea; returns ids. */
async function createPlanId(
  ownerApplication: ReturnType<typeof createTestApplicationForUser>,
): Promise<string> {
  const workspaceResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', {
    name: 'Notes Lab',
  })
  const workspaceBody = (await workspaceResponse.json()) as WorkspaceCreatedBody

  const ideaResponse = await ownerApplication.fetchAsUser(
    `/api/workspaces/${workspaceBody.workspace.id}/ideas`,
    'POST',
    { title: 'Launch week' },
  )
  const ideaBody = (await ideaResponse.json()) as IdeaCreatedBody

  const promoteResponse = await ownerApplication.fetchAsUser(
    `/api/ideas/${ideaBody.idea.ideaId}/promote-to-plan`,
    'POST',
    {},
  )
  const promoteBody = (await promoteResponse.json()) as PlanCreatedBody
  return promoteBody.plan.planId
}

// ---- Tests ------------------------------------------------------------------
describe('the plan document room', () => {
  let ownerApplication: ReturnType<typeof createTestApplicationForUser>
  let outsiderApplication: ReturnType<typeof createTestApplicationForUser>
  let planId: string

  beforeEach(async () => {
    ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    outsiderApplication = createTestApplicationForUser(createTestUserRecord(1))
    planId = await createPlanId(ownerApplication)
  })

  it('answers 401 without an identity, 404 for non-members, and 426 without an upgrade', async () => {
    const unauthenticatedApplication = createTestApplicationWithoutIdentity()
    const unauthenticatedResponse = await unauthenticatedApplication.fetchAsUser(
      `/ws/plans/${planId}/document`,
      'GET',
    )
    expect(unauthenticatedResponse.status).toBe(401)

    const outsiderResponse = await outsiderApplication.fetchAsUser(
      `/ws/plans/${planId}/document`,
      'GET',
    )
    expect(outsiderResponse.status).toBe(404)

    const plainResponse = await ownerApplication.fetchAsUser(`/ws/plans/${planId}/document`, 'GET')
    expect(plainResponse.status).toBe(426)
  })

  it('relays document edits from one editor to another', async () => {
    const owner = createTestUserRecord(0)
    const firstRoom = await connectDocumentMember(planId, owner)

    // The first editor types into a Y.Text and pushes the full state.
    const firstEditorDocument = new Y.Doc()
    firstEditorDocument.getText('notes').insert(0, 'Plan the launch!')
    firstRoom.memberSocket.send(buildSyncStep2Frame(firstEditorDocument))

    // The second editor connects and syncs down what the first wrote.
    const member = createTestUserRecord(2)
    const secondRoom = await connectDocumentMember(planId, member)
    const syncFrame = await waitForFrame(
      secondRoom.receivedFrames,
      (frame) => frame.type === 'sync',
    )
    expect(syncFrame).toBeDefined()

    const secondEditorDocument = new Y.Doc()
    applySyncFrameToClientDocument(requireSyncFrame(syncFrame), secondEditorDocument)
    expect(secondEditorDocument.getText('notes').toString()).toBe('Plan the launch!')

    firstRoom.memberSocket.close()
    secondRoom.memberSocket.close()
  })

  it('keeps edits across reconnects by persisting the merged document', async () => {
    const owner = createTestUserRecord(0)
    const firstRoom = await connectDocumentMember(planId, owner)

    const firstEditorDocument = new Y.Doc()
    firstEditorDocument.getText('notes').insert(0, 'Persisted line')
    firstRoom.memberSocket.send(buildSyncStep2Frame(firstEditorDocument))

    // Leaving as the last editor flushes the room to its storage.
    await new Promise((resolveWait) => setTimeout(resolveWait, 200))
    firstRoom.memberSocket.close()
    await new Promise((resolveWait) => setTimeout(resolveWait, 200))

    // A fresh editor loads straight from storage.
    const member = createTestUserRecord(2)
    const secondRoom = await connectDocumentMember(planId, member)
    const syncFrame = await waitForFrame(
      secondRoom.receivedFrames,
      (frame) => frame.type === 'sync',
    )
    expect(syncFrame).toBeDefined()

    const secondEditorDocument = new Y.Doc()
    applySyncFrameToClientDocument(requireSyncFrame(syncFrame), secondEditorDocument)
    expect(secondEditorDocument.getText('notes').toString()).toBe('Persisted line')

    secondRoom.memberSocket.close()
  })

  it('relays awareness and clears it when an editor leaves', async () => {
    const owner = createTestUserRecord(0)
    const firstRoom = await connectDocumentMember(planId, owner)

    const firstEditorDocument = new Y.Doc()
    const firstEditorAwareness = new awarenessProtocol.Awareness(firstEditorDocument)
    firstEditorAwareness.setLocalState({ user: { name: 'Ada Testuser', color: '#0e7490' } })
    firstRoom.memberSocket.send(buildAwarenessFrame(firstEditorAwareness))

    // A second editor sees the first in the awareness snapshot on join.
    const member = createTestUserRecord(2)
    const secondRoom = await connectDocumentMember(planId, member)
    const awarenessFrame = await waitForFrame(
      secondRoom.receivedFrames,
      (frame) => frame.type === 'awareness',
    )
    expect(awarenessFrame).toBeDefined()

    // When the first editor leaves, the room broadcasts the removal.
    firstRoom.memberSocket.close()
    const removalFrame = await waitForFrame(secondRoom.receivedFrames, (frame) => {
      if (frame.type !== 'awareness') return false
      const snapshotIndex = secondRoom.receivedFrames.indexOf(frame)
      const joinFrameIndex = secondRoom.receivedFrames.indexOf(
        awarenessFrame as ServerRealtimeFrame,
      )
      return snapshotIndex > joinFrameIndex
    })
    expect(removalFrame).toBeDefined()

    secondRoom.memberSocket.close()
  })
})
