// =============================================================================
// FILE:    apps/worker/src/services/brainstorm-service.ts
// PURPOSE: Business rules for brainstorm sessions: create, list (paginated),
//          read with sparks, start (the timer's single server moment), end
//          (which lifts anonymity on the session's sparks), and add a spark —
//          an ordinary idea linked to the session and optionally anonymous.
// USED BY: routes/brainstorm-routes.ts
// =============================================================================

import type {
  AddSessionSparkRequest,
  BrainstormListQuery,
  BrainstormListResponse,
  BrainstormSessionDetailResponse,
  BrainstormSessionResponse,
  CreateBrainstormSessionRequest,
  IdeaResponse,
} from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import type { UserRecord } from '../configuration/record-types'
import { buildInsertActivityEventStatement } from '../database/activity-event-queries'
import {
  buildEndSessionStatement,
  buildInsertSessionStatement,
  buildRevealSessionSparksStatement,
  buildStartSessionStatement,
  findSessionByIdWithCreator,
  listSessionsForWorkspace,
  listSparksForSession,
} from '../database/brainstorm-queries'
import type { IdeoDatabase } from '../database/create-database'
import { asBatchStatements } from '../database/create-database'
import { buildInsertIdeaStatement, listTagsForIdeas } from '../database/idea-queries'
import { findWorkspaceMember } from '../database/workspace-member-queries'
import { validationFailedError, workspaceAccessDeniedError } from '../routes/api-errors'
import { buildIdeaResponse } from './idea-service'

// ---- Types ------------------------------------------------------------------

/** The parts of a created session the route needs to answer with. */
export type CreatedSessionSummary = {
  sessionId: string
  topic: string
  workspaceId: string
}

// ---- Internal helpers ---------------------------------------------------------

/** One ISO-8601 timestamp, shared by all statements in a service call. */
function createIsoTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Guarantees the caller is a member of the session's workspace.
 * Returns the session row; throws the standard 404 when the session is
 * absent or the caller is an outsider.
 */
async function findSessionForMember(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  sessionId: string,
) {
  const foundSession = await findSessionByIdWithCreator(database, sessionId)
  if (!foundSession) throw workspaceAccessDeniedError()

  const membership = await findWorkspaceMember(
    database,
    foundSession.session.workspaceId,
    requestingUser.id,
  )
  if (!membership) throw workspaceAccessDeniedError()

  return foundSession
}

/** Renders one session row (already joined with its creator) as the API shape. */
function buildSessionResponse(
  listRow: {
    session: {
      id: string
      workspaceId: string
      topic: string
      durationSeconds: number
      isAnonymousUntilEnd: number
      startedAt: string | null
      endedAt: string | null
      createdByUserId: string
      createdAt: string
    }
    creatorDisplayName: string
    creatorAvatarColor: string
  },
  sparkCount: number,
): BrainstormSessionResponse {
  return {
    id: listRow.session.id,
    workspaceId: listRow.session.workspaceId,
    topic: listRow.session.topic,
    durationSeconds: listRow.session.durationSeconds,
    isAnonymousUntilEnd: Number(listRow.session.isAnonymousUntilEnd) === 1,
    startedAt: listRow.session.startedAt,
    endedAt: listRow.session.endedAt,
    createdBy: {
      userId: listRow.session.createdByUserId,
      displayName: listRow.creatorDisplayName,
      avatarColor: listRow.creatorAvatarColor,
    },
    sparkCount,
    createdAt: listRow.session.createdAt,
  }
}

// ---- Create and list -----------------------------------------------------------

/** Creates a session in a workspace (not started yet). */
export async function createSessionForWorkspace(
  database: IdeoDatabase,
  creatingUser: UserRecord,
  workspaceId: string,
  sessionRequest: CreateBrainstormSessionRequest,
): Promise<CreatedSessionSummary> {
  const membership = await findWorkspaceMember(database, workspaceId, creatingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const sessionId = crypto.randomUUID()
  const createdAt = createIsoTimestamp()

  await database.batch([
    buildInsertSessionStatement(database, {
      id: sessionId,
      workspaceId,
      topic: sessionRequest.topic,
      durationSeconds: sessionRequest.durationSeconds,
      isAnonymousUntilEnd: sessionRequest.isAnonymousUntilEnd ? 1 : 0,
      createdByUserId: creatingUser.id,
      createdAt,
    }),
    buildInsertActivityEventStatement(database, {
      id: crypto.randomUUID(),
      workspaceId,
      actorUserId: creatingUser.id,
      eventType: 'session_created',
      subjectType: 'brainstorm_session',
      subjectId: sessionId,
      summaryText: `${creatingUser.displayName} scheduled a brainstorm on “${sessionRequest.topic}”`,
      createdAt,
    }),
  ])

  return { sessionId, topic: sessionRequest.topic, workspaceId }
}

/** Lists one page of the workspace's sessions for a member. */
export async function listSessionsForMember(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  workspaceId: string,
  listQuery: BrainstormListQuery,
): Promise<BrainstormListResponse> {
  const membership = await findWorkspaceMember(database, workspaceId, requestingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const listPage = await listSessionsForWorkspace(database, workspaceId, {
    cursor: listQuery.cursor,
    limit: listQuery.limit,
  })

  return {
    sessions: listPage.rows.map((listRow) => buildSessionResponse(listRow, listRow.sparkCount)),
    nextCursor: listPage.nextCursor,
  }
}

// ---- Detail --------------------------------------------------------------------

/** Reads one session with its sparks (anonymity rules applied) for a member. */
export async function getSessionDetailForMember(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  sessionId: string,
): Promise<BrainstormSessionDetailResponse> {
  const foundSession = await findSessionForMember(database, requestingUser, sessionId)

  const sparkRows = await listSparksForSession(database, sessionId, requestingUser.id)
  const sparkIds = sparkRows.map((sparkRow) => sparkRow.idea.id)
  const tagsByIdea = await listTagsForIdeas(database, sparkIds)

  const sparks: IdeaResponse[] = sparkRows.map((sparkRow) =>
    buildIdeaResponse(
      {
        ...sparkRow,
        voteCount: Number(sparkRow.voteCount),
        hasVotedByCurrentUser: Number(sparkRow.hasVotedByCurrentUser) === 1,
        commentCount: Number(sparkRow.commentCount),
      },
      tagsByIdea.get(sparkRow.idea.id) ?? [],
      requestingUser.id,
    ),
  )

  return { session: buildSessionResponse(foundSession, sparks.length), sparks }
}

// ---- Start and end ---------------------------------------------------------------

/** Starts a scheduled session: this moment fixes the timer's end time. */
export async function startSessionForMember(
  database: IdeoDatabase,
  startingUser: UserRecord,
  sessionId: string,
): Promise<{ workspaceId: string }> {
  const foundSession = await findSessionForMember(database, startingUser, sessionId)

  const hasAlreadyStarted = foundSession.session.startedAt !== null
  const hasAlreadyEnded = foundSession.session.endedAt !== null
  if (hasAlreadyStarted || hasAlreadyEnded) {
    throw validationFailedError('That session has already run.')
  }

  const startedAt = createIsoTimestamp()
  await database.batch(
    asBatchStatements([
      buildStartSessionStatement(database, sessionId, startedAt),
      buildInsertActivityEventStatement(database, {
        id: crypto.randomUUID(),
        workspaceId: foundSession.session.workspaceId,
        actorUserId: startingUser.id,
        eventType: 'session_started',
        subjectType: 'brainstorm_session',
        subjectId: sessionId,
        summaryText: `${startingUser.displayName} started the brainstorm “${foundSession.session.topic}”`,
        createdAt: startedAt,
      }),
    ]),
  )

  return { workspaceId: foundSession.session.workspaceId }
}

/**
 * Ends a running session. When the session was anonymous, the sparks' authors
 * are revealed now — that is the whole point of "anonymous until the end".
 */
export async function endSessionForMember(
  database: IdeoDatabase,
  endingUser: UserRecord,
  sessionId: string,
): Promise<{ workspaceId: string }> {
  const foundSession = await findSessionForMember(database, endingUser, sessionId)

  const hasNeverStarted = foundSession.session.startedAt === null
  const hasAlreadyEnded = foundSession.session.endedAt !== null
  if (hasNeverStarted || hasAlreadyEnded) {
    throw validationFailedError('That session is not running.')
  }

  const endedAt = createIsoTimestamp()
  const isAnonymousSession = Number(foundSession.session.isAnonymousUntilEnd) === 1

  await database.batch(
    asBatchStatements([
      buildEndSessionStatement(database, sessionId, endedAt),
      ...(isAnonymousSession ? [buildRevealSessionSparksStatement(database, sessionId)] : []),
      buildInsertActivityEventStatement(database, {
        id: crypto.randomUUID(),
        workspaceId: foundSession.session.workspaceId,
        actorUserId: endingUser.id,
        eventType: 'session_ended',
        subjectType: 'brainstorm_session',
        subjectId: sessionId,
        summaryText: `${endingUser.displayName} ended the brainstorm “${foundSession.session.topic}”`,
        createdAt: endedAt,
      }),
    ]),
  )

  return { workspaceId: foundSession.session.workspaceId }
}

// ---- Sparks -----------------------------------------------------------------------

/**
 * Adds a spark to a running session: an ordinary idea (stage spark) linked to
 * the session, anonymous when the session says so. Returns the idea's id.
 */
export async function addSparkToSessionMember(
  database: IdeoDatabase,
  sparkingUser: UserRecord,
  sessionId: string,
  sparkRequest: AddSessionSparkRequest,
): Promise<{ ideaId: string; workspaceId: string }> {
  const foundSession = await findSessionForMember(database, sparkingUser, sessionId)

  const hasNotStarted = foundSession.session.startedAt === null
  const hasAlreadyEnded = foundSession.session.endedAt !== null
  if (hasNotStarted || hasAlreadyEnded) {
    throw validationFailedError('Sparks can only be added while the session is running.')
  }

  const isAnonymousSession = Number(foundSession.session.isAnonymousUntilEnd) === 1
  const ideaId = crypto.randomUUID()
  const createdAt = createIsoTimestamp()

  await database.batch(
    asBatchStatements([
      buildInsertIdeaStatement(database, {
        id: ideaId,
        workspaceId: foundSession.session.workspaceId,
        authorUserId: sparkingUser.id,
        title: sparkRequest.sparkText,
        description: '',
        stage: 'spark',
        isAnonymous: isAnonymousSession ? 1 : 0,
        brainstormSessionId: sessionId,
        createdAt,
        updatedAt: createdAt,
      }),
      buildInsertActivityEventStatement(database, {
        id: crypto.randomUUID(),
        workspaceId: foundSession.session.workspaceId,
        actorUserId: sparkingUser.id,
        eventType: 'spark_added',
        subjectType: 'brainstorm_session',
        subjectId: sessionId,
        summaryText: `${sparkingUser.displayName} added a spark to “${foundSession.session.topic}”`,
        createdAt,
      }),
    ]),
  )

  return { ideaId, workspaceId: foundSession.session.workspaceId }
}
