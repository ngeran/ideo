// =============================================================================
// FILE:    apps/worker/src/database/brainstorm-queries.ts
// PURPOSE: SQL for brainstorm sessions: create, find (with creator), the
//          paginated workspace list, start/end updates, and the session's
//          sparks (ordinary idea rows linked by brainstorm_session_id).
// USED BY: services/brainstorm-service.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { and, asc, eq, lt, or, sql } from 'drizzle-orm'
import type { BrainstormSessionRecord } from '../configuration/record-types'
import type { IdeoDatabase } from './create-database'
import { brainstormSessions, ideaComments, ideas, ideaVotes, users } from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** Fields for inserting a new session. */
export type NewSessionInput = {
  id: string
  workspaceId: string
  topic: string
  durationSeconds: number
  isAnonymousUntilEnd: number
  createdByUserId: string
  createdAt: string
}

/** One session row joined with its creator and spark counter. */
export type SessionListRow = {
  session: BrainstormSessionRecord
  creatorDisplayName: string
  creatorAvatarColor: string
  sparkCount: number
}

// ---- Statements (for D1 batches) ---------------------------------------------

/** Builds the insert for a new session (un-awaited, for batches). */
export function buildInsertSessionStatement(database: IdeoDatabase, newSession: NewSessionInput) {
  return database.insert(brainstormSessions).values(newSession)
}

/** Builds the start update (un-awaited, for batches). */
export function buildStartSessionStatement(
  database: IdeoDatabase,
  sessionId: string,
  startedAt: string,
) {
  return database
    .update(brainstormSessions)
    .set({ startedAt })
    .where(eq(brainstormSessions.id, sessionId))
}

/** Builds the end update (un-awaited, for batches). */
export function buildEndSessionStatement(
  database: IdeoDatabase,
  sessionId: string,
  endedAt: string,
) {
  return database
    .update(brainstormSessions)
    .set({ endedAt })
    .where(eq(brainstormSessions.id, sessionId))
}

/** Builds the anonymity lift for a session's sparks (un-awaited, for batches). */
export function buildRevealSessionSparksStatement(database: IdeoDatabase, sessionId: string) {
  return database
    .update(ideas)
    .set({ isAnonymous: 0 })
    .where(eq(ideas.brainstormSessionId, sessionId))
}

// ---- Finds and reads ----------------------------------------------------------

/** Fetches one session row, or null when absent. */
export async function findSessionById(
  database: IdeoDatabase,
  sessionId: string,
): Promise<BrainstormSessionRecord | null> {
  const foundSessions = await database
    .select()
    .from(brainstormSessions)
    .where(eq(brainstormSessions.id, sessionId))
    .limit(1)
  return foundSessions[0] ?? null
}

/** Fetches one session joined with its creator's display fields, or null. */
export async function findSessionByIdWithCreator(
  database: IdeoDatabase,
  sessionId: string,
): Promise<{
  session: BrainstormSessionRecord
  creatorDisplayName: string
  creatorAvatarColor: string
} | null> {
  const foundSessions = await database
    .select({
      session: brainstormSessions,
      creatorDisplayName: users.displayName,
      creatorAvatarColor: users.avatarColor,
    })
    .from(brainstormSessions)
    .innerJoin(users, eq(users.id, brainstormSessions.createdByUserId))
    .where(eq(brainstormSessions.id, sessionId))
    .limit(1)
  return foundSessions[0] ?? null
}

/**
 * Lists one page of a workspace's sessions, newest first, with creator names
 * and live spark counters. Returns the page's rows and the next cursor.
 */
export async function listSessionsForWorkspace(
  database: IdeoDatabase,
  workspaceId: string,
  listOptions: { cursor: string | undefined; limit: number },
): Promise<{ rows: SessionListRow[]; nextCursor: string | null }> {
  const fetchLimit = listOptions.limit + 1 // one extra row detects "there is more"

  const conditions = [eq(brainstormSessions.workspaceId, workspaceId)]
  const decodedCursor = decodeSessionListCursor(listOptions.cursor)
  if (decodedCursor !== null) {
    conditions.push(
      or(
        lt(brainstormSessions.createdAt, decodedCursor.lastCreatedAt),
        and(
          eq(brainstormSessions.createdAt, decodedCursor.lastCreatedAt),
          lt(brainstormSessions.id, decodedCursor.lastSessionId),
        ),
      ) ?? sql`1 = 0`,
    )
  }

  const listRows = await database
    .select({
      session: brainstormSessions,
      creatorDisplayName: users.displayName,
      creatorAvatarColor: users.avatarColor,
      sparkCount: sql<number>`(select count(*) from ${ideas} where ${ideas.brainstormSessionId} = ${brainstormSessions.id})`,
    })
    .from(brainstormSessions)
    .innerJoin(users, eq(users.id, brainstormSessions.createdByUserId))
    .where(and(...conditions))
    .orderBy(sql`${brainstormSessions.createdAt} desc`, sql`${brainstormSessions.id} desc`)
    .limit(fetchLimit)

  const hasMoreRows = listRows.length > listOptions.limit
  const pageRows = hasMoreRows ? listRows.slice(0, listOptions.limit) : listRows
  const lastRow = pageRows.at(-1)

  return {
    rows: pageRows.map((listRow) => ({ ...listRow, sparkCount: Number(listRow.sparkCount) })),
    nextCursor:
      hasMoreRows && lastRow !== undefined
        ? encodeSessionListCursor(lastRow.session.createdAt, lastRow.session.id)
        : null,
  }
}

/**
 * Lists a session's sparks (idea rows linked to the session), oldest first,
 * with the full board row shape (author, votes, comments) so the shared idea
 * response builder and its anonymity rule apply unchanged.
 */
export async function listSparksForSession(
  database: IdeoDatabase,
  sessionId: string,
  readerUserId: string,
) {
  return database
    .select({
      idea: ideas,
      authorDisplayName: users.displayName,
      authorAvatarColor: users.avatarColor,
      voteCount: sql<number>`(select count(*) from ${ideaVotes} where ${ideaVotes.ideaId} = ${ideas.id})`,
      hasVotedByCurrentUser: sql<number>`(select count(*) from ${ideaVotes} where ${ideaVotes.ideaId} = ${ideas.id} and ${ideaVotes.userId} = ${readerUserId})`,
      commentCount: sql<number>`(select count(*) from ${ideaComments} where ${ideaComments.ideaId} = ${ideas.id})`,
    })
    .from(ideas)
    .innerJoin(users, eq(users.id, ideas.authorUserId))
    .where(eq(ideas.brainstormSessionId, sessionId))
    .orderBy(asc(ideas.createdAt))
}

// ---- Session list cursor --------------------------------------------------------

/**
 * Encodes the session list's keyset cursor. Same opaque pattern as the other
 * lists; the format is server-private.
 */
export function encodeSessionListCursor(lastCreatedAt: string, lastSessionId: string): string {
  return Buffer.from(JSON.stringify({ t: lastCreatedAt, i: lastSessionId }), 'utf8').toString(
    'base64url',
  )
}

/**
 * Decodes a client-echoed session list cursor.
 * Returns the parsed boundary, or null when absent or malformed.
 */
export function decodeSessionListCursor(
  cursorText: string | undefined,
): { lastCreatedAt: string; lastSessionId: string } | null {
  if (cursorText === undefined) return null

  try {
    const parsedRecord = JSON.parse(
      Buffer.from(cursorText, 'base64url').toString('utf8'),
    ) as Record<string, unknown>
    const isWellFormed = typeof parsedRecord.t === 'string' && typeof parsedRecord.i === 'string'
    return isWellFormed
      ? { lastCreatedAt: parsedRecord.t as string, lastSessionId: parsedRecord.i as string }
      : null
  } catch {
    return null
  }
}
