// =============================================================================
// FILE:    apps/worker/src/database/workspace-member-queries.ts
// PURPOSE: SQL for membership rows: list a workspace's members (for the
//          members card and presence later) and insert new members when
//          someone creates a workspace or joins with an invite.
// USED BY: services, routes
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { and, eq } from 'drizzle-orm'
import type { WorkspaceMemberRecord } from '../configuration/record-types'
import type { IdeoDatabase } from './create-database'
import { users, workspaceMembers } from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** Fields for inserting a new member. */
export type NewWorkspaceMemberInput = {
  workspaceId: string
  userId: string
  memberRole: 'owner' | 'member'
  joinedAt: string
}

/** One member with the display fields the UI needs. */
export type WorkspaceMemberSummary = {
  userId: string
  displayName: string
  avatarColor: string
  memberRole: string
  joinedAt: string
}

// ---- Query functions --------------------------------------------------------

/**
 * Builds the statement that inserts a member row, ignoring duplicates (for
 * D1 batches; joining twice stays harmless).
 * Returns the un-awaited drizzle insert statement.
 */
export function buildInsertWorkspaceMemberStatement(
  database: IdeoDatabase,
  newMember: NewWorkspaceMemberInput,
) {
  return database
    .insert(workspaceMembers)
    .values(newMember)
    .onConflictDoNothing({ target: [workspaceMembers.workspaceId, workspaceMembers.userId] })
}

/**
 * Lists a workspace's members with display fields, longest-standing first.
 * Returns the member summaries (userId, name, color, role, joined date).
 */
export async function listWorkspaceMembers(
  database: IdeoDatabase,
  workspaceId: string,
): Promise<WorkspaceMemberSummary[]> {
  const memberRows = await database
    .select({
      userId: users.id,
      displayName: users.displayName,
      avatarColor: users.avatarColor,
      memberRole: workspaceMembers.memberRole,
      joinedAt: workspaceMembers.joinedAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.joinedAt)

  return memberRows.map((memberRow) => ({ ...memberRow }))
}

/**
 * Finds the user's membership row in a workspace.
 * Returns the membership record, or null when the user is not a member.
 */
export async function findWorkspaceMember(
  database: IdeoDatabase,
  workspaceId: string,
  userId: string,
): Promise<WorkspaceMemberRecord | null> {
  const membershipRows = await database
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1)

  return membershipRows.at(0) ?? null
}
