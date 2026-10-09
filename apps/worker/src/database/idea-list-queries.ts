// =============================================================================
// FILE:    apps/worker/src/database/idea-list-queries.ts
// PURPOSE: The board listing: one paginated query per sort (newest uses a
//          keyset cursor; vote and ICE sorts use an offset cursor), with vote
//          counts, current-user vote state, and comment counts computed in
//          SQL. Tags are fetched for just the returned page.
// USED BY: services/idea-service.ts (listIdeasForWorkspace)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { and, desc, eq, lt, or, sql } from 'drizzle-orm'
import { ideas, users } from '../database/drizzle-schema'
import type { IdeoDatabase } from './create-database'
import type { IdeaRecord } from '../configuration/record-types'
import { decodeIdeaListCursor, encodeKeysetCursor, encodeOffsetCursor } from './idea-list-cursor'
import type { IdeaSortValue } from '@ideo/shared'

// ---- Types ------------------------------------------------------------------

/** One board row as the list query returns it (no tags yet). */
export type IdeaListRow = {
  idea: IdeaRecord
  authorDisplayName: string
  authorAvatarColor: string
  voteCount: number
  hasVotedByCurrentUser: boolean
  commentCount: number
}

/** A page of board rows plus the cursor to continue from. */
export type IdeaListPage = {
  rows: IdeaListRow[]
  nextCursor: string | null
}

/** List options after request validation. */
export type IdeaListOptions = {
  stage: string | undefined
  sort: IdeaSortValue
  cursor: string | undefined
  limit: number
  currentUserId: string
}

// ---- Internal helpers -------------------------------------------------------

/** Correlated subquery: how many votes the idea has. */
function voteCountExpression() {
  return sql<number>`(SELECT COUNT(*) FROM idea_votes WHERE idea_votes.idea_id = ${ideas.id})`
}

/** Correlated subquery: has the current user voted on the idea? */
function hasVotedExpression(currentUserId: string) {
  return sql<boolean>`EXISTS (SELECT 1 FROM idea_votes WHERE idea_votes.idea_id = ${ideas.id} AND idea_votes.user_id = ${currentUserId})`
}

/** Correlated subquery: how many comments the idea has. */
function commentCountExpression() {
  return sql<number>`(SELECT COUNT(*) FROM idea_comments WHERE idea_comments.idea_id = ${ideas.id})`
}

/** The ICE expression for sorting; unscored ideas sink below all scored ones. */
function iceSortExpression() {
  return sql`CASE WHEN ${ideas.impactScore} IS NOT NULL AND ${ideas.confidenceScore} IS NOT NULL
    AND ${ideas.easeScore} IS NOT NULL THEN (${ideas.impactScore} + ${ideas.confidenceScore} + ${ideas.easeScore}) / 3.0
    ELSE -1 END`
}

// ---- Queries ------------------------------------------------------------------

/**
 * Lists one page of the board for a workspace, honoring stage filter, sort,
 * and cursor. Pagination is mandatory on the D1 free tier: the query touches
 * only the page's rows plus its indexes.
 * Returns the page's rows and the cursor for the next page (null when done).
 */
export async function listIdeasForWorkspace(
  database: IdeoDatabase,
  workspaceId: string,
  listOptions: IdeaListOptions,
): Promise<IdeaListPage> {
  const { stage, sort, cursor, limit, currentUserId } = listOptions
  const fetchLimit = limit + 1 // one extra row detects "there is more"

  const selection = {
    idea: ideas,
    authorDisplayName: users.displayName,
    authorAvatarColor: users.avatarColor,
    voteCount: voteCountExpression(),
    hasVotedByCurrentUser: hasVotedExpression(currentUserId),
    commentCount: commentCountExpression(),
  }

  const baseConditions = [eq(ideas.workspaceId, workspaceId)]
  if (stage !== undefined) baseConditions.push(eq(ideas.stage, stage))

  let listRows: Array<IdeaListRow & { rowNumber: number }>

  if (sort === 'newest') {
    const decodedCursor = decodeIdeaListCursor(cursor)
    if (decodedCursor?.kind === 'keyset') {
      baseConditions.push(
        or(
          lt(ideas.createdAt, decodedCursor.lastCreatedAt),
          and(eq(ideas.createdAt, decodedCursor.lastCreatedAt), lt(ideas.id, decodedCursor.lastIdeaId)),
        )!,
      )
    }
    listRows = await database
      .select(selection)
      .from(ideas)
      .innerJoin(users, eq(users.id, ideas.authorUserId))
      .where(and(...baseConditions))
      .orderBy(desc(ideas.createdAt), desc(ideas.id))
      .limit(fetchLimit)
      .then((rows) => rows.map((row, rowNumber) => ({ ...row, rowNumber })))
  } else {
    const decodedCursor = decodeIdeaListCursor(cursor)
    const rowOffset = decodedCursor?.kind === 'offset' ? decodedCursor.rowOffset : 0

    const orderedQuery =
      sort === 'most_voted'
        ? database
            .select(selection)
            .from(ideas)
            .innerJoin(users, eq(users.id, ideas.authorUserId))
            .where(and(...baseConditions))
            .orderBy(desc(voteCountExpression()), desc(ideas.createdAt), desc(ideas.id))
        : database
            .select(selection)
            .from(ideas)
            .innerJoin(users, eq(users.id, ideas.authorUserId))
            .where(and(...baseConditions))
            .orderBy(desc(iceSortExpression()), desc(ideas.createdAt), desc(ideas.id))

    listRows = await orderedQuery
      .limit(fetchLimit)
      .offset(rowOffset)
      .then((rows) => rows.map((row, rowNumber) => ({ ...row, rowNumber: rowNumber + rowOffset })))
  }

  const hasMoreRows = listRows.length > limit
  const pageRows = listRows.slice(0, limit)
  const lastRow = pageRows.at(-1)

  let nextCursor: string | null = null
  if (hasMoreRows && lastRow !== undefined) {
    nextCursor =
      sort === 'newest'
        ? encodeKeysetCursor(lastRow.idea.createdAt, lastRow.idea.id)
        : encodeOffsetCursor(lastRow.rowNumber + 1)
  }

  return { rows: pageRows, nextCursor }
}
