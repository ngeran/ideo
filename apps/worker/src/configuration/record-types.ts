// =============================================================================
// FILE:    apps/worker/src/configuration/record-types.ts
// PURPOSE: The shapes of rows as the application passes them around (Drizzle
//          infers these from the schema; naming them keeps route and service
//          signatures readable).
// USED BY: auth/, routes/, services/, database/
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { InferSelectModel } from 'drizzle-orm'
import type {
  activityEvents,
  users,
  workspaceInvites,
  workspaceMembers,
  workspaces,
} from '../database/drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** One row of the users table. */
export type UserRecord = InferSelectModel<typeof users>

/** One row of the workspaces table. */
export type WorkspaceRecord = InferSelectModel<typeof workspaces>

/** One row of the workspace_members table. */
export type WorkspaceMemberRecord = InferSelectModel<typeof workspaceMembers>

/** One row of the workspace_invites table. */
export type WorkspaceInviteRecord = InferSelectModel<typeof workspaceInvites>

/** One row of the activity_events table. */
export type ActivityEventRecord = InferSelectModel<typeof activityEvents>
