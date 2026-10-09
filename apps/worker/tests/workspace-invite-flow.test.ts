// =============================================================================
// FILE:    apps/worker/tests/workspace-invite-flow.test.ts
// PURPOSE: Proves the join flow end to end: create workspace, create invite,
//          second user joins with the code and becomes a member; bad codes and
//          exhausted invites are rejected with the right errors.
// USED BY: `pnpm test`
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { describe, expect, it } from 'vitest'
import { createTestApplicationForUser, createTestUserRecord } from './test-helpers'

// ---- Types ------------------------------------------------------------------

/** The shapes the flow tests read from JSON responses. */
type WorkspaceCreatedBody = { workspace: { id: string } }
type InviteCreatedBody = { invite: { inviteCode: string } }
type ErrorBody = { error: { code: string } }

// ---- Tests ------------------------------------------------------------------
describe('the invite join flow', () => {
  it('lets a second user join with an invite code and become a member', async () => {
    const ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    const joinerApplication = createTestApplicationForUser(createTestUserRecord(1))

    const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', { name: 'Join Lab' })
    const { workspace } = (await createResponse.json()) as WorkspaceCreatedBody

    const inviteResponse = await ownerApplication.fetchAsUser(`/api/workspaces/${workspace.id}/invites`, 'POST', {})
    expect(inviteResponse.status).toBe(201)
    const { invite } = (await inviteResponse.json()) as InviteCreatedBody

    const joinResponse = await joinerApplication.fetchAsUser('/api/workspaces/join', 'POST', {
      inviteCode: invite.inviteCode,
    })
    expect(joinResponse.status).toBe(200)

    // The joiner can now read the workspace and appears in its members.
    const detailResponse = await joinerApplication.fetchAsUser(`/api/workspaces/${workspace.id}`, 'GET')
    expect(detailResponse.status).toBe(200)
    const detailBody = (await detailResponse.json()) as { members: Array<{ userId: string; memberRole: string }> }
    expect(detailBody.members).toHaveLength(2)
    expect(detailBody.members.some((member) => member.memberRole === 'member')).toBe(true)
  })

  it('accepts a pasted code with spaces and dashes', async () => {
    const ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    const joinerApplication = createTestApplicationForUser(createTestUserRecord(1))

    const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', { name: 'Paste Lab' })
    const { workspace } = (await createResponse.json()) as WorkspaceCreatedBody
    const inviteResponse = await ownerApplication.fetchAsUser(`/api/workspaces/${workspace.id}/invites`, 'POST', {})
    const { invite } = (await inviteResponse.json()) as InviteCreatedBody

    const formattedCode = invite.inviteCode.match(/.{1,4}/g)?.join('-') ?? invite.inviteCode
    const joinResponse = await joinerApplication.fetchAsUser('/api/workspaces/join', 'POST', {
      inviteCode: formattedCode.toLowerCase(),
    })

    expect(joinResponse.status).toBe(200)
  })

  it('answers 404 for an unknown invite code', async () => {
    const joinerApplication = createTestApplicationForUser(createTestUserRecord(1))

    const joinResponse = await joinerApplication.fetchAsUser('/api/workspaces/join', 'POST', {
      inviteCode: 'ZZZZZZZZZZZZ',
    })

    expect(joinResponse.status).toBe(404)
    const errorBody = (await joinResponse.json()) as ErrorBody
    expect(errorBody.error.code).toBe('INVITE_NOT_FOUND')
  })

  it('answers 409 once an invite has no uses left', async () => {
    const ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    const firstJoiner = createTestApplicationForUser(createTestUserRecord(1))
    const secondJoiner = createTestApplicationForUser(createTestUserRecord(2))

    const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', { name: 'Tiny Lab' })
    const { workspace } = (await createResponse.json()) as WorkspaceCreatedBody

    // maximum_uses = 1: the first join consumes it, the second is rejected.
    const inviteResponse = await ownerApplication.fetchAsUser(`/api/workspaces/${workspace.id}/invites`, 'POST', {
      maximumUses: 1,
    })
    const { invite } = (await inviteResponse.json()) as InviteCreatedBody

    await firstJoiner.fetchAsUser('/api/workspaces/join', 'POST', { inviteCode: invite.inviteCode })

    const secondJoinResponse = await secondJoiner.fetchAsUser('/api/workspaces/join', 'POST', {
      inviteCode: invite.inviteCode,
    })
    expect(secondJoinResponse.status).toBe(409)
    const errorBody = (await secondJoinResponse.json()) as ErrorBody
    expect(errorBody.error.code).toBe('INVITE_EXHAUSTED')
  })

  it('rejects a join request whose body fails validation with 422', async () => {
    const joinerApplication = createTestApplicationForUser(createTestUserRecord(1))

    const joinResponse = await joinerApplication.fetchAsUser('/api/workspaces/join', 'POST', { inviteCode: 'short' })

    expect(joinResponse.status).toBe(422)
    const errorBody = (await joinResponse.json()) as ErrorBody
    expect(errorBody.error.code).toBe('VALIDATION_FAILED')
  })
})
