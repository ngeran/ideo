// =============================================================================
// FILE:    apps/worker/src/database/workspace-invite-queries.ts
// PURPOSE: SQL for invite rows: create an invite and look one up by its code
//          (the join flow's first step).
// USED BY: services/invite-service.ts, services/workspace-service.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import type { WorkspaceInviteRecord } from '../configuration/record-types'
import type { IdeoDatabase } from './create-database'
import { workspaceInvites } from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** Fields for inserting a new invite. */
export type NewWorkspaceInviteInput = {
  id: string
  workspaceId: string
  inviteCode: string
  createdByUserId: string
  expiresAt: string
  maximumUses: number
  createdAt: string
}

// ---- Query functions --------------------------------------------------------

/**
 * Builds the statement that inserts an invite row (for D1 batches). The
 * generated code is unique (12 characters from a 31-letter alphabet); a rare
 * collision would violate the unique index instead of silently merging.
 * Returns the un-awaited drizzle insert statement.
 */
export function buildInsertWorkspaceInviteStatement(database: IdeoDatabase, newInvite: NewWorkspaceInviteInput) {
  return database.insert(workspaceInvites).values(newInvite)
}

/**
 * Finds the newest invite with the given code.
 * Returns the invite record, or null when the code is unknown.
 */
export async function findWorkspaceInviteByCode(
  database: IdeoDatabase,
  inviteCode: string,
): Promise<WorkspaceInviteRecord | null> {
  const matchingRows = await database
    .select()
    .from(workspaceInvites)
    .where(eq(workspaceInvites.inviteCode, inviteCode))
    .orderBy(sql`${workspaceInvites.createdAt} DESC`)
    .limit(1)

  return matchingRows.at(0) ?? null
}

/**
 * Builds the statement that counts one use of an invite (times_used += 1),
 * for D1 batches.
 * Returns the un-awaited drizzle update statement.
 */
export function buildIncrementInviteUseStatement(database: IdeoDatabase, inviteId: string) {
  return database
    .update(workspaceInvites)
    .set({ timesUsed: sql`${workspaceInvites.timesUsed} + 1` })
    .where(eq(workspaceInvites.id, inviteId))
}
