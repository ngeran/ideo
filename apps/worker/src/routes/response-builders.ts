// =============================================================================
// FILE:    apps/worker/src/routes/response-builders.ts
// PURPOSE: Turns database records into the shared response shapes (schemas in
//          packages/shared). One layer so routes never hand-assemble JSON.
// USED BY: routes/me-routes.ts, routes/workspace-routes.ts, routes/
//          workspace-invite-routes.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { UserRecord, WorkspaceRecord } from '../configuration/record-types'
import type { WorkspaceMemberSummary } from '../database/workspace-member-queries'
import type { UserResponse, WorkspaceMemberResponse, WorkspaceResponse } from '@ideo/shared'

// ---- Builders ---------------------------------------------------------------

/** Builds the public shape of a user. */
export function buildUserResponse(userRecord: UserRecord): UserResponse {
  return {
    id: userRecord.id,
    email: userRecord.email,
    displayName: userRecord.displayName,
    avatarColor: userRecord.avatarColor,
  }
}

/** Builds the workspace shape the client renders (with the caller's role). */
export function buildWorkspaceResponse(
  workspaceRecord: WorkspaceRecord,
  currentUserRole: 'owner' | 'member',
): WorkspaceResponse {
  return {
    id: workspaceRecord.id,
    name: workspaceRecord.name,
    createdAt: workspaceRecord.createdAt,
    currentUserRole,
  }
}

/** Builds one member entry for the members list. */
export function buildWorkspaceMemberResponse(memberSummary: WorkspaceMemberSummary): WorkspaceMemberResponse {
  return {
    userId: memberSummary.userId,
    displayName: memberSummary.displayName,
    avatarColor: memberSummary.avatarColor,
    memberRole: memberSummary.memberRole === 'owner' ? 'owner' : 'member',
    joinedAt: memberSummary.joinedAt,
  }
}
