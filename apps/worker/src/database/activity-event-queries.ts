// =============================================================================
// FILE:    apps/worker/src/database/activity-event-queries.ts
// PURPOSE: Writing activity rows. Every mutation records one event so the
//          feed (Phase 9) always has data. Reading/feed endpoints come later.
// USED BY: services
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { desc, eq } from 'drizzle-orm'
import type { IdeoDatabase } from './create-database'
import { activityEvents } from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** What happened, in the shape the activity_events table expects. */
export type NewActivityEventInput = {
  id: string
  workspaceId: string
  actorUserId: string
  eventType: string
  subjectType: string
  subjectId: string
  summaryText: string
  createdAt: string
}

// ---- Query functions --------------------------------------------------------

/**
 * Builds the statement that inserts one activity event row (for D1 batches).
 * Recording is part of every mutation's transaction, so the feed can never
 * silently diverge from reality.
 * Returns the un-awaited drizzle insert statement.
 */
export function buildInsertActivityEventStatement(database: IdeoDatabase, newEvent: NewActivityEventInput) {
  return database.insert(activityEvents).values(newEvent)
}

/**
 * Lists a workspace's most recent activity events.
 * Returns up to `limit` events, newest first (used by the feed in Phase 9).
 */
export async function listRecentActivityEvents(
  database: IdeoDatabase,
  workspaceId: string,
  limit: number,
): Promise<Array<{ id: string; summaryText: string; createdAt: string }>> {
  const eventRows = await database
    .select({ id: activityEvents.id, summaryText: activityEvents.summaryText, createdAt: activityEvents.createdAt })
    .from(activityEvents)
    .where(eq(activityEvents.workspaceId, workspaceId))
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit)

  return eventRows
}
