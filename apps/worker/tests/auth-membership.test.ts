// =============================================================================
// FILE:    apps/worker/tests/auth-membership.test.ts
// PURPOSE: Proves the security core of the API: requests without an identity
//          get 401, non-members cannot read a workspace (404 — existence is
//          never revealed), and members get the workspace with its members.
// USED BY: `pnpm test`
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { describe, expect, it } from 'vitest'
import { createTestApplicationForUser, createTestApplicationWithoutIdentity, createTestUserRecord } from './test-helpers'

// ---- Tests ------------------------------------------------------------------
describe('authentication and workspace membership', () => {
  it('creates a workspace with the caller as owner', async () => {
    const ownerApplication = createTestApplicationForUser(createTestUserRecord(0))

    const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', { name: 'Design Lab' })

    expect(createResponse.status).toBe(201)
    const createdBody = (await createResponse.json()) as { workspace: { name: string; currentUserRole: string } }
    expect(createdBody.workspace.name).toBe('Design Lab')
    expect(createdBody.workspace.currentUserRole).toBe('owner')
  })

  it('answers 404 to a non-member without revealing the workspace exists', async () => {
    const ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    const outsiderApplication = createTestApplicationForUser(createTestUserRecord(1))

    const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', { name: 'Secret Plans' })
    const createdBody = (await createResponse.json()) as { workspace: { id: string } }

    const outsiderResponse = await outsiderApplication.fetchAsUser(`/api/workspaces/${createdBody.workspace.id}`, 'GET')

    expect(outsiderResponse.status).toBe(404)
    const errorBody = (await outsiderResponse.json()) as { error: { code: string } }
    expect(errorBody.error.code).toBe('WORKSPACE_ACCESS_DENIED')
  })

  it('answers 401 when the request carries no usable identity', async () => {
    // This is the production failure mode: no valid Access token and no dev
    // fallback — the resolver throws and the error handler answers 401.
    const anonymousApplication = createTestApplicationWithoutIdentity()

    const response = await anonymousApplication.fetchAsUser('/api/me', 'GET')

    expect(response.status).toBe(401)
    const errorBody = (await response.json()) as { error: { code: string } }
    expect(errorBody.error.code).toBe('AUTHENTICATION_REQUIRED')
  })

  it('lets members read the workspace with its member list', async () => {
    const ownerApplication = createTestApplicationForUser(createTestUserRecord(0))

    const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', { name: 'Open Lab' })
    const createdBody = (await createResponse.json()) as { workspace: { id: string } }

    const detailResponse = await ownerApplication.fetchAsUser(`/api/workspaces/${createdBody.workspace.id}`, 'GET')

    expect(detailResponse.status).toBe(200)
    const detailBody = (await detailResponse.json()) as {
      workspace: { name: string }
      members: Array<{ memberRole: string }>
    }
    expect(detailBody.workspace.name).toBe('Open Lab')
    expect(detailBody.members).toHaveLength(1)
    expect(detailBody.members[0]?.memberRole).toBe('owner')
  })
})
