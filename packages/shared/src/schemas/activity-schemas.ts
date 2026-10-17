// =============================================================================
// FILE:    packages/shared/src/schemas/activity-schemas.ts
// PURPOSE: Zod schemas for the activity feed: the list query and the event
//          response rows. Events are written by every mutation (Phase 3+),
//          so the feed is a pure read model.
// USED BY: packages/shared/src/index.ts, worker activity routes, web feed
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { cursorPaginationQuerySchema } from './common-request-schemas'

// ---- Validation schemas -----------------------------------------------------

/** Query string of GET /api/workspaces/:workspaceId/activity. */
export const activityListQuerySchema = cursorPaginationQuerySchema

/** The actor fields on one event (every event has a visible actor). */
const activityActorSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarColor: z.string(),
})

/** One row of the activity feed: who did what, when. */
export const activityEventResponseSchema = z.object({
  id: z.string(),
  actor: activityActorSchema,
  eventType: z.string(),
  subjectType: z.string(),
  subjectId: z.string(),
  summaryText: z.string(),
  createdAt: z.string(),
})

/** Page of events plus the cursor for the next page (null when done). */
export const activityListResponseSchema = z.object({
  events: z.array(activityEventResponseSchema),
  nextCursor: z.string().nullable(),
})

// ---- Types ------------------------------------------------------------------
export type ActivityActorResponse = z.infer<typeof activityActorSchema>
export type ActivityEventResponse = z.infer<typeof activityEventResponseSchema>
export type ActivityListResponse = z.infer<typeof activityListResponseSchema>
