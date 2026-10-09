// =============================================================================
// FILE:    apps/worker/src/database/workspace-queries.ts
// PURPOSE: SQL for workspaces: create one, read one with the caller's role,
//          and list the workspaces a user belongs to (for /api/me and the
//          workspace switcher).
// USED BY: services/workspace-service.ts, routes
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { and, eq } from 'drizzle-orm'
import type { WorkspaceRecord } from '../configuration/record-types'
import type { IdeoDatabase } from './create-database'
import { workspaceMembers, workspaces } from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** Fields for inserting a new workspace. */
export type NewWorkspaceInput = {
  id: string
  name: string
  createdByUserId: string
  createdAt: string
}

// ---- Query functions --------------------------------------------------------

/**
 * Builds the statement that inserts a workspace row (for D1 batches).
 * Returns the un-awaited drizzle insert statement.
 */
export function buildInsertWorkspaceStatement(database: IdeoDatabase, newWorkspace: NewWorkspaceInput) {
  return database.insert(workspaces).values(newWorkspace)
}

/**
 * Finds a workspace by id.
 * Returns the workspace record, or null when the id is unknown.
 */
export async function findWorkspaceById(database: IdeoDatabase, workspaceId: string): Promise<WorkspaceRecord | null> {
  const matchingRows = await database.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1)
  const matchingWorkspace = matchingRows.at(0)
  return matchingWorkspace ?? null
}

/**
 * Finds a workspace by id AND the caller's membership, returning the
 * workspace together with the caller's role. This is the read every
 * workspace-scoped route uses, so role and access come back in one query.
 * Returns null when the workspace does not exist OR the user is not a member
 * (callers turn both into the same 404 — never reveal existence to outsiders).
 */
export async function findWorkspaceForMember(
  database: IdeoDatabase,
  workspaceId: string,
  userId: string,
): Promise<{ workspace: WorkspaceRecord; memberRole: 'owner' | 'member' } | null> {
  const matchingRows = await database
    .select({ workspace: workspaces, memberRole: workspaceMembers.memberRole })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(and(eq(workspaces.id, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1)

  const matchingRow = matchingRows.at(0)
  if (!matchingRow) return null

  return {
    workspace: matchingRow.workspace,
    memberRole: matchingRow.memberRole as 'owner' | 'member',
  }
}

/**
 * Lists every workspace the user is a member of, oldest first.
 * Returns the workspace records with the user's role on each.
 */
export async function listWorkspacesForUser(
  database: IdeoDatabase,
  userId: string,
): Promise<Array<{ workspace: WorkspaceRecord; memberRole: 'owner' | 'member' }>> {
  const membershipRows = await database
    .select({ workspace: workspaces, memberRole: workspaceMembers.memberRole })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.createdAt)

  return membershipRows.map((membershipRow) => ({
    workspace: membershipRow.workspace,
    memberRole: membershipRow.memberRole as 'owner' | 'member',
  }))
}
