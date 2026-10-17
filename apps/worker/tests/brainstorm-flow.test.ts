// =============================================================================
// FILE:    apps/worker/tests/brainstorm-flow.test.ts
// PURPOSE: End-to-end brainstorm tests over real D1: create → start → sparks
//          (anonymous on the board) → end (authors revealed), plus the
//          lifecycle gates and membership rules.
// USED BY: `pnpm test`
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createTestApplicationForUser,
  createTestApplicationWithoutIdentity,
  createTestUserRecord,
} from './test-helpers'

// ---- Types ------------------------------------------------------------------

/** Shapes the tests read from JSON responses. */
type WorkspaceCreatedBody = { workspace: { id: string } }
type SessionCreatedBody = { session: { sessionId: string; topic: string } }
type SessionListBody = {
  sessions: Array<{
    id: string
    topic: string
    isAnonymousUntilEnd: boolean
    startedAt: string | null
    endedAt: string | null
    sparkCount: number
    createdBy: { displayName: string }
  }>
  nextCursor: string | null
}
type SessionDetailBody = {
  session: { id: string; startedAt: string | null; endedAt: string | null; sparkCount: number }
  sparks: Array<{
    id: string
    title: string
    isAnonymous: boolean
    author: { displayName: string } | null
  }>
}
type IdeaListBody = {
  ideas: Array<{
    id: string
    title: string
    isAnonymous: boolean
    author: { displayName: string } | null
  }>
}

// ---- Helpers ------------------------------------------------------------------

/** Creates a workspace for the owner application and returns its id. */
async function createWorkspaceId(
  ownerApplication: ReturnType<typeof createTestApplicationForUser>,
): Promise<string> {
  const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', {
    name: 'Brainstorm Lab',
  })
  const createdBody = (await createResponse.json()) as WorkspaceCreatedBody
  return createdBody.workspace.id
}

/** Adds the member to the workspace through a fresh single-use invite. */
async function addMemberToWorkspace(
  ownerApplication: ReturnType<typeof createTestApplicationForUser>,
  memberApplication: ReturnType<typeof createTestApplicationForUser>,
  workspaceId: string,
): Promise<void> {
  const inviteResponse = await ownerApplication.fetchAsUser(
    `/api/workspaces/${workspaceId}/invites`,
    'POST',
    { maximumUses: 5 },
  )
  const { invite } = (await inviteResponse.json()) as { invite: { inviteCode: string } }
  await memberApplication.fetchAsUser('/api/workspaces/join', 'POST', {
    inviteCode: invite.inviteCode,
  })
}

/** Starts a fresh anonymous session and returns its id. */
async function createAndStartSession(
  ownerApplication: ReturnType<typeof createTestApplicationForUser>,
  workspaceId: string,
): Promise<string> {
  const createResponse = await ownerApplication.fetchAsUser(
    `/api/workspaces/${workspaceId}/brainstorm-sessions`,
    'POST',
    { topic: 'Launch ideas', durationSeconds: 600, isAnonymousUntilEnd: true },
  )
  const createdBody = (await createResponse.json()) as SessionCreatedBody
  await ownerApplication.fetchAsUser(
    `/api/brainstorm-sessions/${createdBody.session.sessionId}/start`,
    'POST',
  )
  return createdBody.session.sessionId
}

// ---- Tests ------------------------------------------------------------------
describe('the brainstorm flow', () => {
  let ownerApplication: ReturnType<typeof createTestApplicationForUser>
  let memberApplication: ReturnType<typeof createTestApplicationForUser>
  let workspaceId: string

  beforeEach(async () => {
    ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    memberApplication = createTestApplicationForUser(createTestUserRecord(1))
    workspaceId = await createWorkspaceId(ownerApplication)
    await addMemberToWorkspace(ownerApplication, memberApplication, workspaceId)
  })

  it('creates and starts a session, then refuses to start it twice', async () => {
    const createResponse = await memberApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/brainstorm-sessions`,
      'POST',
      { topic: 'Onboarding ideas', durationSeconds: 300 },
    )
    expect(createResponse.status).toBe(201)
    const { session } = (await createResponse.json()) as SessionCreatedBody
    expect(session.topic).toBe('Onboarding ideas')

    const startResponse = await memberApplication.fetchAsUser(
      `/api/brainstorm-sessions/${session.sessionId}/start`,
      'POST',
    )
    expect(startResponse.status).toBe(200)

    const secondStartResponse = await memberApplication.fetchAsUser(
      `/api/brainstorm-sessions/${session.sessionId}/start`,
      'POST',
    )
    expect(secondStartResponse.status).toBe(422)

    const detailResponse = await memberApplication.fetchAsUser(
      `/api/brainstorm-sessions/${session.sessionId}`,
      'GET',
    )
    const detailBody = (await detailResponse.json()) as SessionDetailBody
    expect(detailBody.session.startedAt).not.toBeNull()
    expect(detailBody.session.endedAt).toBeNull()
  })

  it('keeps sparks anonymous until the session ends, then reveals them', async () => {
    const sessionId = await createAndStartSession(ownerApplication, workspaceId)

    const sparkResponse = await memberApplication.fetchAsUser(
      `/api/brainstorm-sessions/${sessionId}/sparks`,
      'POST',
      { sparkText: 'A demo day every Friday' },
    )
    expect(sparkResponse.status).toBe(201)

    // While running, the board hides the spark's author from everyone else…
    const ownerBoardResponse = await ownerApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/ideas`,
      'GET',
    )
    const ownerBoardBody = (await ownerBoardResponse.json()) as IdeaListBody
    const hiddenSpark = ownerBoardBody.ideas.find(
      (idea) => idea.title === 'A demo day every Friday',
    )
    expect(hiddenSpark?.isAnonymous).toBe(true)
    expect(hiddenSpark?.author).toBeNull()

    // …and the session detail does the same for other readers.
    const ownerDetailResponse = await ownerApplication.fetchAsUser(
      `/api/brainstorm-sessions/${sessionId}`,
      'GET',
    )
    const ownerDetailBody = (await ownerDetailResponse.json()) as SessionDetailBody
    expect(ownerDetailBody.sparks[0]?.author).toBeNull()

    // Ending the session lifts anonymity everywhere.
    const endResponse = await ownerApplication.fetchAsUser(
      `/api/brainstorm-sessions/${sessionId}/end`,
      'POST',
    )
    expect(endResponse.status).toBe(200)

    const revealedBoardResponse = await ownerApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/ideas`,
      'GET',
    )
    const revealedBoardBody = (await revealedBoardResponse.json()) as IdeaListBody
    const revealedSpark = revealedBoardBody.ideas.find(
      (idea) => idea.title === 'A demo day every Friday',
    )
    expect(revealedSpark?.isAnonymous).toBe(false)
    expect(revealedSpark?.author?.displayName).toContain('Testuser')

    const revealedDetailResponse = await memberApplication.fetchAsUser(
      `/api/brainstorm-sessions/${sessionId}`,
      'GET',
    )
    const revealedDetailBody = (await revealedDetailResponse.json()) as SessionDetailBody
    expect(revealedDetailBody.sparks[0]?.author?.displayName).toContain('Testuser')
    expect(revealedDetailBody.session.sparkCount).toBe(1)
  })

  it('refuses sparks outside a running session and double ends', async () => {
    const createResponse = await ownerApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/brainstorm-sessions`,
      'POST',
      { topic: 'Not started yet' },
    )
    const { session } = (await createResponse.json()) as SessionCreatedBody

    const earlySparkResponse = await memberApplication.fetchAsUser(
      `/api/brainstorm-sessions/${session.sessionId}/sparks`,
      'POST',
      { sparkText: 'Too early' },
    )
    expect(earlySparkResponse.status).toBe(422)

    const earlyEndResponse = await memberApplication.fetchAsUser(
      `/api/brainstorm-sessions/${session.sessionId}/end`,
      'POST',
    )
    expect(earlyEndResponse.status).toBe(422)

    await ownerApplication.fetchAsUser(
      `/api/brainstorm-sessions/${session.sessionId}/start`,
      'POST',
    )
    const endResponse = await ownerApplication.fetchAsUser(
      `/api/brainstorm-sessions/${session.sessionId}/end`,
      'POST',
    )
    expect(endResponse.status).toBe(200)

    const lateSparkResponse = await memberApplication.fetchAsUser(
      `/api/brainstorm-sessions/${session.sessionId}/sparks`,
      'POST',
      { sparkText: 'Too late' },
    )
    expect(lateSparkResponse.status).toBe(422)

    const doubleEndResponse = await ownerApplication.fetchAsUser(
      `/api/brainstorm-sessions/${session.sessionId}/end`,
      'POST',
    )
    expect(doubleEndResponse.status).toBe(422)
  })

  it('lists sessions with spark counts and gates outsiders', async () => {
    const sessionId = await createAndStartSession(ownerApplication, workspaceId)
    await memberApplication.fetchAsUser(`/api/brainstorm-sessions/${sessionId}/sparks`, 'POST', {
      sparkText: 'First spark',
    })

    const listResponse = await memberApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/brainstorm-sessions`,
      'GET',
    )
    expect(listResponse.status).toBe(200)
    const listBody = (await listResponse.json()) as SessionListBody
    expect(listBody.sessions).toHaveLength(1)
    expect(listBody.sessions[0]?.sparkCount).toBe(1)
    expect(listBody.sessions[0]?.isAnonymousUntilEnd).toBe(true)
    expect(listBody.sessions[0]?.createdBy.displayName).toContain('Testuser')

    const outsiderApplication = createTestApplicationForUser(createTestUserRecord(2))
    const outsiderListResponse = await outsiderApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/brainstorm-sessions`,
      'GET',
    )
    expect(outsiderListResponse.status).toBe(404)

    const outsiderDetailResponse = await outsiderApplication.fetchAsUser(
      `/api/brainstorm-sessions/${sessionId}`,
      'GET',
    )
    expect(outsiderDetailResponse.status).toBe(404)

    const unauthenticatedApplication = createTestApplicationWithoutIdentity()
    const unauthenticatedResponse = await unauthenticatedApplication.fetchAsUser(
      `/api/brainstorm-sessions/${sessionId}`,
      'GET',
    )
    expect(unauthenticatedResponse.status).toBe(401)
  })
})
