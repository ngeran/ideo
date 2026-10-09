// =============================================================================
// FILE:    apps/worker/src/database/idea-queries.ts
// PURPOSE: SQL for single-idea operations: create, read (with author), update,
//          tags, votes, and comments. The paginated board listing lives in
//          idea-list-queries.ts.
// USED BY: services/idea-service.ts, database/idea-list-queries.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { and, eq, inArray } from 'drizzle-orm'
import { asc, sql } from 'drizzle-orm'
import type { IdeaRecord } from '../configuration/record-types'
import type { IdeoDatabase } from './create-database'
import { ideaComments, ideaTags, ideaVotes, ideas, users } from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** Fields for inserting a new idea. */
export type NewIdeaInput = {
  id: string
  workspaceId: string
  authorUserId: string
  title: string
  description: string
  stage: string
  createdAt: string
  updatedAt: string
}

/** One comment with its author's display fields. */
export type IdeaCommentRecordWithAuthor = {
  id: string
  commentText: string
  authorUserId: string
  authorDisplayName: string
  authorAvatarColor: string
  createdAt: string
}

// ---- Statements (for D1 batches) ---------------------------------------------

/** Builds the insert for a new idea row (un-awaited, for batches). */
export function buildInsertIdeaStatement(database: IdeoDatabase, newIdea: NewIdeaInput) {
  return database.insert(ideas).values({
    ...newIdea,
    isAnonymous: 0,
    impactScore: null,
    confidenceScore: null,
    easeScore: null,
  })
}

/** Builds the insert for one tag row (un-awaited, for batches). */
export function buildInsertIdeaTagStatement(database: IdeoDatabase, ideaId: string, tagLabel: string) {
  return database.insert(ideaTags).values({ ideaId, tagLabel }).onConflictDoNothing({
    target: [ideaTags.ideaId, ideaTags.tagLabel],
  })
}

/** Builds the update for editable idea fields; scores are set explicitly. */
export function buildUpdateIdeaStatement(
  database: IdeoDatabase,
  ideaId: string,
  updatedFields: Partial<{
    title: string
    description: string
    stage: string
    impactScore: number | null
    confidenceScore: number | null
    easeScore: number | null
    updatedAt: string
  }>,
) {
  return database.update(ideas).set(updatedFields).where(eq(ideas.id, ideaId))
}

/** Builds the insert for one vote; duplicates are a no-op (un-awaited). */
export function buildInsertIdeaVoteStatement(database: IdeoDatabase, ideaId: string, userId: string, votedAt: string) {
  return database
    .insert(ideaVotes)
    .values({ ideaId, userId, createdAt: votedAt })
    .onConflictDoNothing({ target: [ideaVotes.ideaId, ideaVotes.userId] })
}

/** Builds the delete that removes one user's vote (un-awaited). */
export function buildDeleteIdeaVoteStatement(database: IdeoDatabase, ideaId: string, userId: string) {
  return database
    .delete(ideaVotes)
    .where(and(eq(ideaVotes.ideaId, ideaId), eq(ideaVotes.userId, userId)))
}

/** Builds the insert for one comment (un-awaited, for batches). */
export function buildInsertIdeaCommentStatement(
  database: IdeoDatabase,
  commentInput: { id: string; ideaId: string; authorUserId: string; commentText: string; createdAt: string },
) {
  return database.insert(ideaComments).values(commentInput)
}

/** Builds the tag replacement: clear the idea's tags (un-awaited, for batches). */
export function buildDeleteIdeaTagsStatement(database: IdeoDatabase, ideaId: string) {
  return database.delete(ideaTags).where(eq(ideaTags.ideaId, ideaId))
}

// ---- Queries ------------------------------------------------------------------

/**
 * Finds one idea with its author's display fields.
 * Returns the idea record plus author info, or null when unknown.
 */
export async function findIdeaByIdWithAuthor(
  database: IdeoDatabase,
  ideaId: string,
): Promise<{ idea: IdeaRecord; authorDisplayName: string; authorAvatarColor: string } | null> {
  const matchingRows = await database
    .select({
      idea: ideas,
      authorDisplayName: users.displayName,
      authorAvatarColor: users.avatarColor,
    })
    .from(ideas)
    .innerJoin(users, eq(users.id, ideas.authorUserId))
    .where(eq(ideas.id, ideaId))
    .limit(1)

  const matchingRow = matchingRows.at(0)
  return matchingRow ?? null
}

/**
 * Reads the tag labels for a set of ideas, grouped by idea id.
 * Returns a Map from ideaId to its (possibly empty) tag list.
 */
export async function listTagsForIdeas(database: IdeoDatabase, ideaIds: string[]): Promise<Map<string, string[]>> {
  const tagsByIdea = new Map<string, string[]>(ideaIds.map((ideaId) => [ideaId, []]))
  if (ideaIds.length === 0) return tagsByIdea

  const tagRows = await database
    .select({ ideaId: ideaTags.ideaId, tagLabel: ideaTags.tagLabel })
    .from(ideaTags)
    .where(inArray(ideaTags.ideaId, ideaIds))

  for (const tagRow of tagRows) {
    tagsByIdea.get(tagRow.ideaId)?.push(tagRow.tagLabel)
  }
  return tagsByIdea
}

/**
 * Reads one idea's vote statistics for the current user.
 * Returns the vote count and whether the user has voted.
 */
export async function findIdeaVoteStats(
  database: IdeoDatabase,
  ideaId: string,
  currentUserId: string,
): Promise<{ voteCount: number; hasVotedByCurrentUser: boolean }> {
  const statsRows = await database
    .select({
      voteCount: sql<number>`(SELECT COUNT(*) FROM idea_votes WHERE idea_votes.idea_id = ${ideaVotes.ideaId})`,
      hasVotedByCurrentUser: sql<boolean>`EXISTS (SELECT 1 FROM idea_votes WHERE idea_votes.idea_id = ${ideaVotes.ideaId} AND idea_votes.user_id = ${currentUserId})`,
    })
    .from(ideaVotes)
    .where(eq(ideaVotes.ideaId, ideaId))
    .limit(1)

  // The subqueries are scalar: one row comes back even with zero votes.
  const statsRow = statsRows.at(0)
  return {
    voteCount: statsRow?.voteCount ?? 0,
    hasVotedByCurrentUser: Boolean(statsRow?.hasVotedByCurrentUser),
  }
}

/**
 * Reads one idea's comments, oldest first, with author display fields.
 * Returns the comment records (empty when the idea has none).
 */
export async function listIdeaComments(
  database: IdeoDatabase,
  ideaId: string,
): Promise<IdeaCommentRecordWithAuthor[]> {
  const commentRows = await database
    .select({
      id: ideaComments.id,
      commentText: ideaComments.commentText,
      authorUserId: users.id,
      authorDisplayName: users.displayName,
      authorAvatarColor: users.avatarColor,
      createdAt: ideaComments.createdAt,
    })
    .from(ideaComments)
    .innerJoin(users, eq(users.id, ideaComments.authorUserId))
    .where(eq(ideaComments.ideaId, ideaId))
    .orderBy(asc(ideaComments.createdAt))

  return commentRows
}
