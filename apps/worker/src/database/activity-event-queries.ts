// =============================================================================
// FILE:    apps/worker/src/database/activity-event-queries.ts
// PURPOSE: Writing and reading activity rows. Every mutation records one
//          event in its transaction, so the feed can never silently diverge
//          from reality; the feed reads them newest first, paginated.
// USED BY: services (write), services/activity-service.ts (read)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { and, desc, eq, lt, or, sql } from 'drizzle-orm'
import type { IdeoDatabase } from './create-database'
import { activityEvents, users } from './drizzle-schema'

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

/** One event row joined with its actor's display fields. */
export type ActivityEventRow = {
  id: string
  eventType: string
  subjectType: string
  subjectId: string
  summaryText: string
  createdAt: string
  actorUserId: string
  actorDisplayName: string
  actorAvatarColor: string
}

// ---- Query functions --------------------------------------------------------

/**
 * Builds the statement that inserts one activity event row (for D1 batches).
 * Recording is part of every mutation's transaction, so the feed can never
 * silently diverge from reality.
 * Returns the un-awaited drizzle insert statement.
 */
export function buildInsertActivityEventStatement(
  database: IdeoDatabase,
  newEvent: NewActivityEventInput,
) {
  return database.insert(activityEvents).values(newEvent)
}

/**
 * Lists one page of a workspace's activity, newest first, with actor names.
 * Pagination is mandatory on the D1 free tier: the query touches only the
 * page's rows plus the workspace/time index.
 * Returns the page's rows and the cursor for the next page (null when done).
 */
export async function listActivityForWorkspace(
  database: IdeoDatabase,
  workspaceId: string,
  listOptions: { cursor: string | undefined; limit: number },
): Promise<{ rows: ActivityEventRow[]; nextCursor: string | null }> {
  const fetchLimit = listOptions.limit + 1 // one extra row detects "there is more"

  const conditions = [eq(activityEvents.workspaceId, workspaceId)]
  const decodedCursor = decodeActivityListCursor(listOptions.cursor)
  if (decodedCursor !== null) {
    conditions.push(
      or(
        lt(activityEvents.createdAt, decodedCursor.lastCreatedAt),
        and(
          eq(activityEvents.createdAt, decodedCursor.lastCreatedAt),
          lt(activityEvents.id, decodedCursor.lastEventId),
        ),
      ) ?? sql`1 = 0`,
    )
  }

  const eventRows = await database
    .select({
      id: activityEvents.id,
      eventType: activityEvents.eventType,
      subjectType: activityEvents.subjectType,
      subjectId: activityEvents.subjectId,
      summaryText: activityEvents.summaryText,
      createdAt: activityEvents.createdAt,
      actorUserId: activityEvents.actorUserId,
      actorDisplayName: users.displayName,
      actorAvatarColor: users.avatarColor,
    })
    .from(activityEvents)
    .innerJoin(users, eq(users.id, activityEvents.actorUserId))
    .where(and(...conditions))
    .orderBy(desc(activityEvents.createdAt), desc(activityEvents.id))
    .limit(fetchLimit)

  const hasMoreRows = eventRows.length > listOptions.limit
  const pageRows = hasMoreRows ? eventRows.slice(0, listOptions.limit) : eventRows
  const lastRow = pageRows.at(-1)

  return {
    rows: pageRows,
    nextCursor:
      hasMoreRows && lastRow !== undefined
        ? encodeActivityListCursor(lastRow.createdAt, lastRow.id)
        : null,
  }
}

// ---- Activity list cursor ------------------------------------------------------

/**
 * Encodes the activity list's keyset cursor. Same opaque pattern as the
 * other lists; the format is server-private.
 */
export function encodeActivityListCursor(lastCreatedAt: string, lastEventId: string): string {
  return Buffer.from(JSON.stringify({ t: lastCreatedAt, i: lastEventId }), 'utf8').toString(
    'base64url',
  )
}

/**
 * Decodes a client-echoed activity list cursor.
 * Returns the parsed boundary, or null when absent or malformed.
 */
export function decodeActivityListCursor(
  cursorText: string | undefined,
): { lastCreatedAt: string; lastEventId: string } | null {
  if (cursorText === undefined) return null

  try {
    const parsedRecord = JSON.parse(
      Buffer.from(cursorText, 'base64url').toString('utf8'),
    ) as Record<string, unknown>
    const isWellFormed = typeof parsedRecord.t === 'string' && typeof parsedRecord.i === 'string'
    return isWellFormed
      ? { lastCreatedAt: parsedRecord.t as string, lastEventId: parsedRecord.i as string }
      : null
  } catch {
    return null
  }
}
