// =============================================================================
// FILE:    apps/worker/tests/activity-export.test.ts
// PURPOSE: Activity feed and export tests over real D1: events appear newest
//          first with actors, paginate, gate outsiders; the export serves
//          Markdown and JSON bundles carrying the workspace's content.
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
type IdeaCreatedBody = { idea: { ideaId: string } }
type ActivityListBody = {
  events: Array<{ summaryText: string; actor: { displayName: string }; eventType: string }>
  nextCursor: string | null
}

// ---- Helpers ------------------------------------------------------------------

/** Creates a workspace for the owner application and returns its id. */
async function createWorkspaceId(
  ownerApplication: ReturnType<typeof createTestApplicationForUser>,
): Promise<string> {
  const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', {
    name: 'Feed Lab',
  })
  const createdBody = (await createResponse.json()) as WorkspaceCreatedBody
  return createdBody.workspace.id
}

/** Creates one idea as the owner and returns its id. */
async function createIdeaId(
  ownerApplication: ReturnType<typeof createTestApplicationForUser>,
  workspaceId: string,
): Promise<string> {
  const createResponse = await ownerApplication.fetchAsUser(
    `/api/workspaces/${workspaceId}/ideas`,
    'POST',
    { title: 'Feed the feed' },
  )
  const createdBody = (await createResponse.json()) as IdeaCreatedBody
  return createdBody.idea.ideaId
}

// ---- Tests ------------------------------------------------------------------
describe('the activity feed and export', () => {
  let ownerApplication: ReturnType<typeof createTestApplicationForUser>
  let workspaceId: string

  beforeEach(async () => {
    ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    workspaceId = await createWorkspaceId(ownerApplication)
    await createIdeaId(ownerApplication, workspaceId)
  })

  it('lists events newest first with actors, and paginates', async () => {
    const listResponse = await ownerApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/activity?limit=1`,
      'GET',
    )
    expect(listResponse.status).toBe(200)
    const firstPage = (await listResponse.json()) as ActivityListBody
    expect(firstPage.events).toHaveLength(1)
    // The idea creation is the newest event.
    expect(firstPage.events[0]?.eventType).toBe('idea_created')
    expect(firstPage.events[0]?.actor.displayName).toContain('Testuser')
    expect(firstPage.nextCursor).not.toBeNull()

    const secondResponse = await ownerApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/activity?limit=1&cursor=${firstPage.nextCursor}`,
      'GET',
    )
    const secondPage = (await secondResponse.json()) as ActivityListBody
    expect(secondPage.events).toHaveLength(1)
    // The workspace creation came before the idea creation.
    expect(secondPage.events[0]?.eventType).toBe('workspace_created')
  })

  it('gates the feed by membership and identity', async () => {
    const outsiderApplication = createTestApplicationForUser(createTestUserRecord(2))
    const outsiderResponse = await outsiderApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/activity`,
      'GET',
    )
    expect(outsiderResponse.status).toBe(404)

    const unauthenticatedApplication = createTestApplicationWithoutIdentity()
    const unauthenticatedResponse = await unauthenticatedApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/activity`,
      'GET',
    )
    expect(unauthenticatedResponse.status).toBe(401)
  })

  it('exports the workspace as Markdown carrying its content', async () => {
    const exportResponse = await ownerApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/export?format=markdown`,
      'GET',
    )
    expect(exportResponse.status).toBe(200)
    expect(exportResponse.headers.get('content-type')).toContain('text/markdown')

    const markdownBody = await exportResponse.text()
    expect(markdownBody).toContain('Ideo export — Feed Lab')
    expect(markdownBody).toContain('## Ideas (1)')
    expect(markdownBody).toContain('### Feed the feed')
    expect(markdownBody).toContain('## Members')
  })

  it('exports the workspace as JSON with the structured bundle', async () => {
    const exportResponse = await ownerApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/export?format=json`,
      'GET',
    )
    expect(exportResponse.status).toBe(200)
    expect(exportResponse.headers.get('content-type')).toContain('application/json')

    const bundle = (await exportResponse.json()) as {
      workspace: { name: string }
      ideas: Array<{ title: string }>
      plans: unknown[]
      members: Array<{ displayName: string }>
    }
    expect(bundle.workspace.name).toBe('Feed Lab')
    expect(bundle.ideas.map((bundleIdea) => bundleIdea.title)).toContain('Feed the feed')
    expect(bundle.members[0]?.displayName).toContain('Testuser')
  })
})
