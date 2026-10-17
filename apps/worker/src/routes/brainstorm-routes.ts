// =============================================================================
// FILE:    apps/worker/src/routes/brainstorm-routes.ts
// PURPOSE: Brainstorm session endpoints: create, list, detail (session +
//          sparks), start, end, and add a spark. Handlers stay thin — parse,
//          delegate to the service, respond, then notify the room.
// USED BY: create-application.ts (mounted at /api)
// =============================================================================

import { zValidator } from '@hono/zod-validator'
import {
  addSessionSparkRequestSchema,
  brainstormListQuerySchema,
  brainstormListResponseSchema,
  brainstormSessionDetailResponseSchema,
  createBrainstormSessionRequestSchema,
} from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createDatabase } from '../database/create-database'
import { notifyWorkspaceRoomAfterResponse } from '../realtime/notify-workspace-room'
import {
  addSparkToSessionMember,
  createSessionForWorkspace,
  endSessionForMember,
  getSessionDetailForMember,
  listSessionsForMember,
  startSessionForMember,
} from '../services/brainstorm-service'
import { validationFailedError } from './api-errors'

// ---- Validation helpers -----------------------------------------------------

/** Turns a failed validation into our standard error body. */
function reportZodFailure(validationResult: {
  success: boolean
  error?: { issues: Array<{ message: string }> }
}) {
  const failedValidation = !validationResult.success && validationResult.error !== undefined
  if (failedValidation) {
    const failureMessages = (validationResult.error?.issues ?? [])
      .map((issue) => issue.message)
      .join('; ')
    throw validationFailedError(failureMessages)
  }
}

// ---- Route factories --------------------------------------------------------

/**
 * Creates the brainstorm route group.
 * Returns a Hono instance mounted under /api with:
 *   POST /workspaces/:workspaceId/brainstorm-sessions     create a session
 *   GET  /workspaces/:workspaceId/brainstorm-sessions     paginated list
 *   GET  /brainstorm-sessions/:sessionId                  session + sparks
 *   POST /brainstorm-sessions/:sessionId/start            start the timer
 *   POST /brainstorm-sessions/:sessionId/end              end + reveal
 *   POST /brainstorm-sessions/:sessionId/sparks           add a spark
 */
export function createBrainstormRoutes(
  currentUserResolver: CurrentUserResolver,
): Hono<AuthenticatedContext> {
  const brainstormRoutes = new Hono<AuthenticatedContext>()

  brainstormRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  brainstormRoutes.post(
    '/workspaces/:workspaceId/brainstorm-sessions',
    zValidator('json', createBrainstormSessionRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const sessionRequest = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const createdSession = await createSessionForWorkspace(
        database,
        currentUser,
        requestContext.req.param('workspaceId'),
        sessionRequest,
      )
      return requestContext.json(
        { session: { sessionId: createdSession.sessionId, topic: createdSession.topic } },
        201,
      )
    },
  )

  brainstormRoutes.get(
    '/workspaces/:workspaceId/brainstorm-sessions',
    zValidator('query', brainstormListQuerySchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const listQuery = requestContext.req.valid('query')
      const database = createDatabase(requestContext.env.DATABASE)

      const listResponse = await listSessionsForMember(
        database,
        currentUser,
        requestContext.req.param('workspaceId'),
        listQuery,
      )
      return requestContext.json(brainstormListResponseSchema.parse(listResponse))
    },
  )

  brainstormRoutes.get('/brainstorm-sessions/:sessionId', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const database = createDatabase(requestContext.env.DATABASE)

    const detailResponse = await getSessionDetailForMember(
      database,
      currentUser,
      requestContext.req.param('sessionId'),
    )
    return requestContext.json(brainstormSessionDetailResponseSchema.parse(detailResponse))
  })

  brainstormRoutes.post('/brainstorm-sessions/:sessionId/start', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const database = createDatabase(requestContext.env.DATABASE)

    const startResult = await startSessionForMember(
      database,
      currentUser,
      requestContext.req.param('sessionId'),
    )

    // Clients re-fetch the session for its startedAt and count down locally.
    notifyWorkspaceRoomAfterResponse(requestContext, requestContext.env, startResult.workspaceId, {
      type: 'workspace_event',
      eventType: 'session_started',
      subjectId: requestContext.req.param('sessionId'),
    })
    return requestContext.json({ ok: true })
  })

  brainstormRoutes.post('/brainstorm-sessions/:sessionId/end', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const database = createDatabase(requestContext.env.DATABASE)

    const endResult = await endSessionForMember(
      database,
      currentUser,
      requestContext.req.param('sessionId'),
    )

    // The session page refetches; the board refetches because anonymous
    // sparks just revealed their authors there too.
    notifyWorkspaceRoomAfterResponse(requestContext, requestContext.env, endResult.workspaceId, {
      type: 'workspace_event',
      eventType: 'session_ended',
      subjectId: requestContext.req.param('sessionId'),
    })
    return requestContext.json({ ok: true })
  })

  brainstormRoutes.post(
    '/brainstorm-sessions/:sessionId/sparks',
    zValidator('json', addSessionSparkRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const sparkRequest = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const sparkResult = await addSparkToSessionMember(
        database,
        currentUser,
        requestContext.req.param('sessionId'),
        sparkRequest,
      )

      // The session page and the board (sparks are ideas there too) refresh.
      notifyWorkspaceRoomAfterResponse(
        requestContext,
        requestContext.env,
        sparkResult.workspaceId,
        {
          type: 'workspace_event',
          eventType: 'spark_added',
          subjectId: requestContext.req.param('sessionId'),
        },
      )
      notifyWorkspaceRoomAfterResponse(
        requestContext,
        requestContext.env,
        sparkResult.workspaceId,
        {
          type: 'workspace_event',
          eventType: 'idea_created',
          subjectId: sparkResult.ideaId,
        },
      )
      return requestContext.json({ spark: { ideaId: sparkResult.ideaId } }, 201)
    },
  )

  return brainstormRoutes
}
