// =============================================================================
// FILE:    apps/worker/src/services/idea-service.ts
// PURPOSE: Business rules for ideas: create, list (with anonymity applied and
//          ICE computed), read with comments, update (fields + tag replace),
//          toggle a vote, and comment. Every mutation records an activity
//          event in the same transaction.
// USED BY: routes/idea-routes.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { BatchItem } from 'drizzle-orm/batch'
import type { CreateIdeaRequest, IdeaListQuery, UpdateIdeaRequest } from '@ideo/shared'
import { calculateIceScore } from '@ideo/shared'
import type {
  IdeaAuthorResponse,
  IdeaCommentResponse,
  IdeaDetailResponse,
  IdeaListResponse,
  IdeaResponse,
} from '@ideo/shared'
import type { UserRecord } from '../configuration/record-types'
import type { IdeoDatabase } from '../database/create-database'
import { asBatchStatements } from '../database/create-database'
import { buildInsertActivityEventStatement } from '../database/activity-event-queries'
import {
  buildDeleteIdeaTagsStatement,
  buildInsertIdeaCommentStatement,
  buildInsertIdeaStatement,
  buildInsertIdeaTagStatement,
  buildUpdateIdeaStatement,
  buildInsertIdeaVoteStatement,
  buildDeleteIdeaVoteStatement,
  findIdeaByIdWithAuthor,
  findIdeaVoteStats,
  listIdeaComments,
  listTagsForIdeas,
} from '../database/idea-queries'
import { listIdeasForWorkspace } from '../database/idea-list-queries'
import type { IdeaListRow } from '../database/idea-list-queries'
import { findWorkspaceMember } from '../database/workspace-member-queries'
import { workspaceAccessDeniedError } from '../routes/api-errors'
import { IDEA_STAGE_LABELS } from '@ideo/shared'

// ---- Types ------------------------------------------------------------------

/** The parts of a created idea the route needs to answer with. */
export type CreatedIdeaSummary = {
  ideaId: string
  title: string
  stage: string
}

// ---- Internal helpers ---------------------------------------------------------

/** One ISO-8601 timestamp, shared by all statements in a service call. */
function createIsoTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Applies the anonymity rule: an anonymous idea shows its author only to the
 * author themselves.
 * Returns the author response, or null when hidden.
 */
function resolveVisibleAuthor(
  listRow: { idea: { authorUserId: string; isAnonymous: boolean | number }; authorDisplayName: string; authorAvatarColor: string },
  currentUserId: string,
): IdeaAuthorResponse | null {
  const isAuthorHerself = listRow.idea.authorUserId === currentUserId
  const isAnonymousIdea = Number(listRow.idea.isAnonymous) === 1
  if (isAnonymousIdea && !isAuthorHerself) return null

  return {
    userId: listRow.idea.authorUserId,
    displayName: listRow.authorDisplayName,
    avatarColor: listRow.authorAvatarColor,
  }
}

/** Builds the board response for one row (tags passed in from the page query). */
function buildIdeaResponse(listRow: IdeaListRow, tags: string[], currentUserId: string): IdeaResponse {
  const { idea } = listRow
  return {
    id: idea.id,
    workspaceId: idea.workspaceId,
    title: idea.title,
    description: idea.description,
    stage: idea.stage as IdeaResponse['stage'],
    impactScore: idea.impactScore,
    confidenceScore: idea.confidenceScore,
    easeScore: idea.easeScore,
    iceScore: calculateIceScore({
      impactScore: idea.impactScore,
      confidenceScore: idea.confidenceScore,
      easeScore: idea.easeScore,
    }),
    tags,
    voteCount: listRow.voteCount,
    hasVotedByCurrentUser: Boolean(listRow.hasVotedByCurrentUser),
    isAnonymous: Number(idea.isAnonymous) === 1,
    author: resolveVisibleAuthor(listRow, currentUserId),
    commentCount: listRow.commentCount,
    createdAt: idea.createdAt,
    updatedAt: idea.updatedAt,
  }
}

// ---- Services ---------------------------------------------------------------

/**
 * Lists one page of the board for a member, with tags, ICE scores, and the
 * anonymity rule applied.
 * Returns the page as the API answers it.
 */
export async function listIdeasForWorkspaceMember(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  workspaceId: string,
  listQuery: IdeaListQuery,
): Promise<IdeaListResponse> {
  const membership = await findWorkspaceMember(database, workspaceId, requestingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const page = await listIdeasForWorkspace(database, workspaceId, {
    stage: listQuery.stage,
    sort: listQuery.sort,
    cursor: listQuery.cursor,
    limit: listQuery.limit,
    currentUserId: requestingUser.id,
  })

  const tagsByIdea = await listTagsForIdeas(database, page.rows.map((row) => row.idea.id))

  return {
    ideas: page.rows.map((row) => buildIdeaResponse(row, tagsByIdea.get(row.idea.id) ?? [], requestingUser.id)),
    nextCursor: page.nextCursor,
  }
}

/**
 * Creates an idea in a workspace (stage defaults to spark; tags are attached
 * in the same transaction along with the first activity event).
 * Returns the created idea's id, title, and stage.
 */
export async function createIdeaInWorkspace(
  database: IdeoDatabase,
  authorUser: UserRecord,
  workspaceId: string,
  ideaRequest: CreateIdeaRequest,
): Promise<CreatedIdeaSummary> {
  const membership = await findWorkspaceMember(database, workspaceId, authorUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const ideaId = crypto.randomUUID()
  const createdAt = createIsoTimestamp()

  await database.batch([
    buildInsertIdeaStatement(database, {
      id: ideaId,
      workspaceId,
      authorUserId: authorUser.id,
      title: ideaRequest.title,
      description: ideaRequest.description,
      stage: 'spark',
      createdAt,
      updatedAt: createdAt,
    }),
    ...ideaRequest.tags.map((tagLabel) => buildInsertIdeaTagStatement(database, ideaId, tagLabel)),
    buildInsertActivityEventStatement(database, {
      id: crypto.randomUUID(),
      workspaceId,
      actorUserId: authorUser.id,
      eventType: 'idea_created',
      subjectType: 'idea',
      subjectId: ideaId,
      summaryText: `${authorUser.displayName} added the idea “${ideaRequest.title}”`,
      createdAt,
    }),
  ])

  return { ideaId, title: ideaRequest.title, stage: 'spark' }
}

/**
 * Updates an idea: title, description, stage, ICE scores, and tags (replaced
 * wholesale). Stage changes get their own activity event.
 * Returns nothing; the client refetches.
 */
export async function updateIdeaForWorkspace(
  database: IdeoDatabase,
  editingUser: UserRecord,
  ideaId: string,
  updateRequest: UpdateIdeaRequest,
): Promise<void> {
  const foundIdea = await findIdeaByIdWithAuthor(database, ideaId)
  if (!foundIdea) throw workspaceAccessDeniedError()

  const membership = await findWorkspaceMember(database, foundIdea.idea.workspaceId, editingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const updatedAt = createIsoTimestamp()
  const { tags: replacementTags, ...fieldUpdates } = updateRequest
  const statements: BatchItem<'sqlite'>[] = [
    buildUpdateIdeaStatement(database, ideaId, {
      ...fieldUpdates,
      updatedAt,
    }),
  ]

  if (replacementTags !== undefined) {
    statements.push(buildDeleteIdeaTagsStatement(database, ideaId))
    for (const tagLabel of replacementTags) {
      statements.push(buildInsertIdeaTagStatement(database, ideaId, tagLabel))
    }
  }

  // Narrow once so both the event type and the label read cleanly.
  const changedStage =
    updateRequest.stage !== undefined && updateRequest.stage !== foundIdea.idea.stage ? updateRequest.stage : undefined

  statements.push(
    buildInsertActivityEventStatement(database, {
      id: crypto.randomUUID(),
      workspaceId: foundIdea.idea.workspaceId,
      actorUserId: editingUser.id,
      eventType: changedStage !== undefined ? 'idea_stage_changed' : 'idea_updated',
      subjectType: 'idea',
      subjectId: ideaId,
      summaryText:
        changedStage !== undefined
          ? `${editingUser.displayName} moved “${foundIdea.idea.title}” to ${IDEA_STAGE_LABELS[changedStage]}`
          : `${editingUser.displayName} updated the idea “${foundIdea.idea.title}”`,
      createdAt: updatedAt,
    }),
  )

  await database.batch(asBatchStatements(statements))
}

/**
 * Toggles the user's vote on an idea: votes when absent, un-votes when
 * present. Returns whether the idea is now voted on by the user.
 */
export async function toggleIdeaVoteForMember(
  database: IdeoDatabase,
  votingUser: UserRecord,
  ideaId: string,
): Promise<boolean> {
  const foundIdea = await findIdeaByIdWithAuthor(database, ideaId)
  if (!foundIdea) throw workspaceAccessDeniedError()

  const membership = await findWorkspaceMember(database, foundIdea.idea.workspaceId, votingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const votedAt = createIsoTimestamp()
  const insertResult = await buildInsertIdeaVoteStatement(database, ideaId, votingUser.id, votedAt).run()
  const isNowVoted = insertResult.meta.changes === 1

  if (!isNowVoted) {
    // The insert was a duplicate: the vote existed, so remove it.
    await buildDeleteIdeaVoteStatement(database, ideaId, votingUser.id).run()
  }

  const voteVerb = isNowVoted ? 'voted on' : 'removed their vote from'
  await database.batch([
    buildInsertActivityEventStatement(database, {
      id: crypto.randomUUID(),
      workspaceId: foundIdea.idea.workspaceId,
      actorUserId: votingUser.id,
      eventType: 'idea_voted',
      subjectType: 'idea',
      subjectId: ideaId,
      summaryText: `${votingUser.displayName} ${voteVerb} “${foundIdea.idea.title}”`,
      createdAt: votedAt,
    }),
  ])

  return isNowVoted
}

/**
 * Reads one idea with its comments for a member, applying the anonymity rule.
 * Returns the detail response the drawer renders.
 */
export async function getIdeaDetailForMember(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  ideaId: string,
): Promise<IdeaDetailResponse> {
  const foundIdea = await findIdeaByIdWithAuthor(database, ideaId)
  if (!foundIdea) throw workspaceAccessDeniedError()

  const membership = await findWorkspaceMember(database, foundIdea.idea.workspaceId, requestingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const [tagsByIdea, comments, voteStats] = await Promise.all([
    listTagsForIdeas(database, [ideaId]),
    listIdeaComments(database, ideaId),
    findIdeaVoteStats(database, ideaId, requestingUser.id),
  ])

  const listRowShape = {
    idea: foundIdea.idea,
    authorDisplayName: foundIdea.authorDisplayName,
    authorAvatarColor: foundIdea.authorAvatarColor,
    voteCount: voteStats.voteCount,
    hasVotedByCurrentUser: voteStats.hasVotedByCurrentUser,
    commentCount: comments.length,
  }

  const ideaResponse = buildIdeaResponse(listRowShape, tagsByIdea.get(ideaId) ?? [], requestingUser.id)

  const commentResponses: IdeaCommentResponse[] = comments.map((comment) => ({
    id: comment.id,
    commentText: comment.commentText,
    author: {
      userId: comment.authorUserId,
      displayName: comment.authorDisplayName,
      avatarColor: comment.authorAvatarColor,
    },
    createdAt: comment.createdAt,
  }))

  return { idea: ideaResponse, comments: commentResponses }
}

/**
 * Adds a comment to an idea and records the activity.
 * Returns the comment's id.
 */
export async function addIdeaCommentForMember(
  database: IdeoDatabase,
  commentingUser: UserRecord,
  ideaId: string,
  commentText: string,
): Promise<string> {
  const foundIdea = await findIdeaByIdWithAuthor(database, ideaId)
  if (!foundIdea) throw workspaceAccessDeniedError()

  const membership = await findWorkspaceMember(database, foundIdea.idea.workspaceId, commentingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const commentId = crypto.randomUUID()
  const createdAt = createIsoTimestamp()

  await database.batch([
    buildInsertIdeaCommentStatement(database, {
      id: commentId,
      ideaId,
      authorUserId: commentingUser.id,
      commentText,
      createdAt,
    }),
    buildInsertActivityEventStatement(database, {
      id: crypto.randomUUID(),
      workspaceId: foundIdea.idea.workspaceId,
      actorUserId: commentingUser.id,
      eventType: 'comment_added',
      subjectType: 'idea',
      subjectId: ideaId,
      summaryText: `${commentingUser.displayName} commented on “${foundIdea.idea.title}”`,
      createdAt,
    }),
  ])

  return commentId
}
