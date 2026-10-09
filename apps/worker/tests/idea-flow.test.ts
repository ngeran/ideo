// =============================================================================
// FILE:    apps/worker/tests/idea-flow.test.ts
// PURPOSE: End-to-end idea tests over real D1: create → list → vote →
//          comment → update, plus the anonymity rule and pagination.
// USED BY: `pnpm test`
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { beforeEach } from 'vitest'
import { describe, expect, it } from 'vitest'
import {
  createTestApplicationForUser,
  createTestApplicationWithoutIdentity,
  createTestUserRecord,
} from './test-helpers'

// ---- Types ------------------------------------------------------------------

/** Shapes the tests read from JSON responses. */
type WorkspaceCreatedBody = { workspace: { id: string } }
type IdeaCreatedBody = { idea: { ideaId: string } }
type IdeaListBody = {
  ideas: Array<{
    id: string
    title: string
    stage: string
    iceScore: number | null
    tags: string[]
    voteCount: number
    hasVotedByCurrentUser: boolean
    author: { displayName: string } | null
    isAnonymous: boolean
    commentCount: number
  }>
  nextCursor: string | null
}
type IdeaDetailBody = {
  idea: { voteCount: number; hasVotedByCurrentUser: boolean; iceScore: number | null }
  comments: Array<{ commentText: string; author: { displayName: string } }>
}

// ---- Helpers ------------------------------------------------------------------

/** Creates a workspace for the owner application and returns its id. */
async function createWorkspaceId(ownerApplication: ReturnType<typeof createTestApplicationForUser>): Promise<string> {
  const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', { name: 'Idea Lab' })
  const createdBody = (await createResponse.json()) as WorkspaceCreatedBody
  return createdBody.workspace.id
}

// ---- Tests ------------------------------------------------------------------
describe('the idea flow', () => {
  let ownerApplication: ReturnType<typeof createTestApplicationForUser>
  let memberApplication: ReturnType<typeof createTestApplicationForUser>
  let workspaceId: string

  beforeEach(async () => {
    ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    memberApplication = createTestApplicationForUser(createTestUserRecord(1))
    workspaceId = await createWorkspaceId(ownerApplication)

    // The member joins with a single-use invite.
    const inviteResponse = await ownerApplication.fetchAsUser(`/api/workspaces/${workspaceId}/invites`, 'POST', {
      maximumUses: 5,
    })
    const { invite } = (await inviteResponse.json()) as { invite: { inviteCode: string } }
    await memberApplication.fetchAsUser('/api/workspaces/join', 'POST', { inviteCode: invite.inviteCode })
  })

  it('creates an idea and lists it on the board with tags and spark stage', async () => {
    const createResponse = await memberApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'POST', {
      title: 'Weekly demo day',
      description: 'Show finished work every Friday.',
      tags: ['Ritual', 'ritual', ' cadence '],
    })
    expect(createResponse.status).toBe(201)

    const listResponse = await memberApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'GET')
    const listBody = (await listResponse.json()) as IdeaListBody

    expect(listBody.ideas).toHaveLength(1)
    const listedIdea = listBody.ideas[0]
    expect(listedIdea?.title).toBe('Weekly demo day')
    expect(listedIdea?.stage).toBe('spark')
    // Tags normalize (trimmed, lowercased, deduplicated) and come back in
    // stable alphabetical order (the tag table's primary key order).
    expect(listedIdea?.tags).toEqual(['cadence', 'ritual'])
    expect(listedIdea?.voteCount).toBe(0)
    expect(listedIdea?.hasVotedByCurrentUser).toBe(false)
    expect(listedIdea?.author?.displayName).toBe('Grace Testuser')
  })

  it('computes the ICE score only when all three scores are set', async () => {
    const createResponse = await ownerApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'POST', {
      title: 'ICE check',
    })
    const { idea } = (await createResponse.json()) as IdeaCreatedBody

    await ownerApplication.fetchAsUser(`/api/ideas/${idea.ideaId}`, 'PATCH', {
      impactScore: 8,
      confidenceScore: 6,
      easeScore: 10,
    })

    const detailResponse = await ownerApplication.fetchAsUser(`/api/ideas/${idea.ideaId}`, 'GET')
    const detailBody = (await detailResponse.json()) as IdeaDetailBody
    expect(detailBody.idea.iceScore).toBe(8)
  })

  it('toggles a vote and reports the state per user', async () => {
    const createResponse = await ownerApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'POST', {
      title: 'Vote magnet',
    })
    const { idea } = (await createResponse.json()) as IdeaCreatedBody

    const firstVoteResponse = await memberApplication.fetchAsUser(`/api/ideas/${idea.ideaId}/vote`, 'POST')
    expect(((await firstVoteResponse.json()) as { isVotedByCurrentUser: boolean }).isVotedByCurrentUser).toBe(true)

    const secondVoteResponse = await memberApplication.fetchAsUser(`/api/ideas/${idea.ideaId}/vote`, 'POST')
    expect(((await secondVoteResponse.json()) as { isVotedByCurrentUser: boolean }).isVotedByCurrentUser).toBe(false)
  })

  it('hides the author of an anonymous idea from other members', async () => {
    // Created via API with is_anonymous defaulting to 0; flip it through PATCH
    // is not exposed, so create with a direct insert instead:
    const createResponse = await memberApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'POST', {
      title: 'Brave suggestion',
    })
    const { idea } = (await createResponse.json()) as IdeaCreatedBody

    // The API has no anonymous creation yet (sessions land in Phase 8); the
    // rule is exercised by patching the row directly in the test database.
    const { env } = await import('cloudflare:test')
    await env.DATABASE.prepare('UPDATE ideas SET is_anonymous = 1 WHERE id = ?').bind(idea.ideaId).run()

    const ownerListResponse = await ownerApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'GET')
    const ownerListBody = (await ownerListResponse.json()) as IdeaListBody
    const ideaAsSeenByOwner = ownerListBody.ideas.find((listedIdea) => listedIdea.id === idea.ideaId)
    expect(ideaAsSeenByOwner?.author).toBeNull()

    // The author still sees themselves.
    const memberListResponse = await memberApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'GET')
    const memberListBody = (await memberListResponse.json()) as IdeaListBody
    const ideaAsSeenByAuthor = memberListBody.ideas.find((listedIdea) => listedIdea.id === idea.ideaId)
    expect(ideaAsSeenByAuthor?.author?.displayName).toBe('Grace Testuser')
  })

  it('adds comments and returns them oldest first in the detail', async () => {
    const createResponse = await ownerApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'POST', {
      title: 'Comment target',
    })
    const { idea } = (await createResponse.json()) as IdeaCreatedBody

    await memberApplication.fetchAsUser(`/api/ideas/${idea.ideaId}/comments`, 'POST', {
      commentText: 'First!',
    })
    await ownerApplication.fetchAsUser(`/api/ideas/${idea.ideaId}/comments`, 'POST', {
      commentText: 'Second.',
    })

    const detailResponse = await memberApplication.fetchAsUser(`/api/ideas/${idea.ideaId}`, 'GET')
    const detailBody = (await detailResponse.json()) as IdeaDetailBody
    expect(detailBody.comments.map((comment) => comment.commentText)).toEqual(['First!', 'Second.'])
    expect(detailBody.idea.voteCount).toBe(0)
  })

  it('paginates the newest sort with an opaque cursor', async () => {
    for (const ideaTitle of ['Idea one', 'Idea two', 'Idea three']) {
      await ownerApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'POST', { title: ideaTitle })
    }

    const firstPageResponse = await ownerApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/ideas?limit=2&sort=newest`,
      'GET',
    )
    const firstPageBody = (await firstPageResponse.json()) as IdeaListBody
    expect(firstPageBody.ideas).toHaveLength(2)
    expect(firstPageBody.ideas[0]?.title).toBe('Idea three') // newest first
    expect(firstPageBody.nextCursor).not.toBeNull()

    const secondPageResponse = await ownerApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/ideas?limit=2&sort=newest&cursor=${firstPageBody.nextCursor}`,
      'GET',
    )
    const secondPageBody = (await secondPageResponse.json()) as IdeaListBody
    expect(secondPageBody.ideas).toHaveLength(1)
    expect(secondPageBody.ideas[0]?.title).toBe('Idea one')
    expect(secondPageBody.nextCursor).toBeNull()
  })

  it('answers 404 to a non-member listing ideas (no existence leak)', async () => {
    const outsiderApplication = createTestApplicationForUser(createTestUserRecord(2))
    const listResponse = await outsiderApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'GET')
    expect(listResponse.status).toBe(404)
  })

  it('answers 401 without an identity', async () => {
    const anonymousApplication = createTestApplicationWithoutIdentity()
    const listResponse = await anonymousApplication.fetchAsUser(`/api/workspaces/${workspaceId}/ideas`, 'GET')
    expect(listResponse.status).toBe(401)
  })
})
