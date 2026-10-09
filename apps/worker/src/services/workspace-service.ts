// =============================================================================
// FILE:    apps/worker/src/services/workspace-service.ts
// PURPOSE: Business rules for creating a workspace and joining one with an
//          invite. Routes only parse and respond; every rule (owner becomes
//          first member, invite expiry/limits, activity recording) lives here.
// USED BY: routes/workspace-routes.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { UserRecord, WorkspaceRecord } from '../configuration/record-types'
import type { IdeoDatabase } from '../database/create-database'
import { buildInsertActivityEventStatement } from '../database/activity-event-queries'
import { buildInsertWorkspaceMemberStatement } from '../database/workspace-member-queries'
import { findWorkspaceInviteByCode, buildIncrementInviteUseStatement } from '../database/workspace-invite-queries'
import { buildInsertWorkspaceStatement, findWorkspaceById } from '../database/workspace-queries'
import { inviteExhaustedError, inviteExpiredError, inviteNotFoundError } from '../routes/api-errors'

// ---- Types ------------------------------------------------------------------

/** The membership role values, mirroring the SQL CHECK constraint. */
export type MemberRole = 'owner' | 'member'

// ---- Internal helpers -------------------------------------------------------

/** One ISO-8601 timestamp, shared by all statements in a service call. */
function createIsoTimestamp(): string {
  return new Date().toISOString()
}

// ---- Services ---------------------------------------------------------------

/**
 * Creates a workspace owned by the given user: the workspace row, the owner
 * membership, and the first activity event, written atomically (D1 batch).
 * Returns the created workspace record.
 */
export async function createWorkspaceOwnedByUser(
  database: IdeoDatabase,
  ownerUser: UserRecord,
  workspaceName: string,
): Promise<WorkspaceRecord> {
  const workspaceId = crypto.randomUUID()
  const createdAt = createIsoTimestamp()

  await database.batch([
    buildInsertWorkspaceStatement(database, {
      id: workspaceId,
      name: workspaceName,
      createdByUserId: ownerUser.id,
      createdAt,
    }),
    buildInsertWorkspaceMemberStatement(database, {
      workspaceId,
      userId: ownerUser.id,
      memberRole: 'owner',
      joinedAt: createdAt,
    }),
    buildInsertActivityEventStatement(database, {
      id: crypto.randomUUID(),
      workspaceId,
      actorUserId: ownerUser.id,
      eventType: 'workspace_created',
      subjectType: 'workspace',
      subjectId: workspaceId,
      summaryText: `${ownerUser.displayName} created the workspace “${workspaceName}”`,
      createdAt,
    }),
  ])

  return { id: workspaceId, name: workspaceName, createdByUserId: ownerUser.id, createdAt }
}

/**
 * Joins the caller into a workspace using an invite code: validates the code,
 * expiry, and remaining uses; adds the membership; counts the use; records
 * activity — all atomically. Already-being-a-member is an idempotent success
 * that does not consume a use.
 * Returns the joined workspace record.
 */
export async function joinWorkspaceWithInviteCode(
  database: IdeoDatabase,
  joiningUser: UserRecord,
  inviteCode: string,
): Promise<WorkspaceRecord> {
  const invite = await findWorkspaceInviteByCode(database, inviteCode)
  if (!invite) throw inviteNotFoundError()

  const nowIso = createIsoTimestamp()
  if (invite.expiresAt <= nowIso) throw inviteExpiredError()
  if (invite.timesUsed >= invite.maximumUses) throw inviteExhaustedError()

  const joinedWorkspace = await findWorkspaceById(database, invite.workspaceId)
  // The invite references its workspace with a foreign key, so a missing row
  // would mean corruption; still, never 500 — answer as unknown invite.
  if (!joinedWorkspace) throw inviteNotFoundError()

  const joinedAt = createIsoTimestamp()
  await database.batch([
    buildInsertWorkspaceMemberStatement(database, {
      workspaceId: invite.workspaceId,
      userId: joiningUser.id,
      memberRole: 'member',
      joinedAt,
    }),
    buildIncrementInviteUseStatement(database, invite.id),
    buildInsertActivityEventStatement(database, {
      id: crypto.randomUUID(),
      workspaceId: invite.workspaceId,
      actorUserId: joiningUser.id,
      eventType: 'member_joined',
      subjectType: 'workspace',
      subjectId: invite.workspaceId,
      summaryText: `${joiningUser.displayName} joined the workspace`,
      createdAt: joinedAt,
    }),
  ])

  return joinedWorkspace
}
