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
  brainstormSessions,
  ideaComments,
  ideas,
  planMilestones,
  plans,
  tasks,
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

/** One row of the ideas table. */
export type IdeaRecord = InferSelectModel<typeof ideas>

/** One row of the idea_comments table. */
export type IdeaCommentRecord = InferSelectModel<typeof ideaComments>

/** One row of the plans table. */
export type PlanRecord = InferSelectModel<typeof plans>

/** One row of the plan_milestones table. */
export type PlanMilestoneRecord = InferSelectModel<typeof planMilestones>

/** One row of the tasks table. */
export type TaskRecord = InferSelectModel<typeof tasks>

/** One row of the brainstorm_sessions table. */
export type BrainstormSessionRecord = InferSelectModel<typeof brainstormSessions>
