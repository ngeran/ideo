// =============================================================================
// FILE:    apps/worker/src/services/invite-service.ts
// PURPOSE: Business rules for creating invites: sensible defaults (14 days,
//          25 uses), code generation, and activity recording. Any member of a
//          workspace may invite — Ideo is a small, trusted team by design.
// USED BY: routes/workspace-invite-routes.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { UserRecord, WorkspaceInviteRecord } from '../configuration/record-types'
import { buildInsertActivityEventStatement } from '../database/activity-event-queries'
import type { IdeoDatabase } from '../database/create-database'
import { buildInsertWorkspaceInviteStatement } from '../database/workspace-invite-queries'
import { createInviteCode } from './create-invite-code'

// ---- Types ------------------------------------------------------------------

/** Caller-controlled invite options (validated by the request schema). */
export type InviteOptions = {
  expiresInDays: number
  maximumUses: number
}

// ---- Constants --------------------------------------------------------------

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000

// ---- Services ---------------------------------------------------------------

/**
 * Creates an invite for a workspace: generates the code, stamps expiry and
 * limits, writes the row and an activity event atomically.
 * Returns the created invite record.
 */
export async function createWorkspaceInviteForWorkspace(
  database: IdeoDatabase,
  invitingUser: UserRecord,
  workspaceId: string,
  workspaceName: string,
  inviteOptions: InviteOptions,
): Promise<WorkspaceInviteRecord> {
  const inviteId = crypto.randomUUID()
  const inviteCode = createInviteCode()
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + inviteOptions.expiresInDays * MILLIS_PER_DAY)

  await database.batch([
    buildInsertWorkspaceInviteStatement(database, {
      id: inviteId,
      workspaceId,
      inviteCode,
      createdByUserId: invitingUser.id,
      expiresAt: expiresAt.toISOString(),
      maximumUses: inviteOptions.maximumUses,
      createdAt: createdAt.toISOString(),
    }),
    buildInsertActivityEventStatement(database, {
      id: crypto.randomUUID(),
      workspaceId,
      actorUserId: invitingUser.id,
      eventType: 'invite_created',
      subjectType: 'workspace_invite',
      subjectId: inviteId,
      summaryText: `${invitingUser.displayName} created an invite for “${workspaceName}”`,
      createdAt: createdAt.toISOString(),
    }),
  ])

  return {
    id: inviteId,
    workspaceId,
    inviteCode,
    createdByUserId: invitingUser.id,
    expiresAt: expiresAt.toISOString(),
    maximumUses: inviteOptions.maximumUses,
    timesUsed: 0,
    createdAt: createdAt.toISOString(),
  }
}
