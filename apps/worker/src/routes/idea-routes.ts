// =============================================================================
// FILE:    apps/worker/src/routes/idea-routes.ts
// PURPOSE: Idea endpoints: board listing (paginated), create, read with
//          comments, update, vote toggle, and comment. Handlers stay thin —
//          parse, delegate to the service, respond.
// USED BY: create-application.ts (mounted at /api)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import {
  createIdeaCommentRequestSchema,
  createIdeaRequestSchema,
  ideaDetailResponseSchema,
  ideaListQuerySchema,
  ideaListResponseSchema,
  updateIdeaRequestSchema,
} from '@ideo/shared'
import { createDatabase } from '../database/create-database'
import {
  addIdeaCommentForMember,
  createIdeaInWorkspace,
  getIdeaDetailForMember,
  listIdeasForWorkspaceMember,
  toggleIdeaVoteForMember,
  updateIdeaForWorkspace,
} from '../services/idea-service'
import { validationFailedError } from './api-errors'

// ---- Validation helpers -----------------------------------------------------

/** Turns a failed validation into our standard error body. */
function reportZodFailure(validationResult: {
  success: boolean
  error?: { issues: Array<{ message: string }> }
}) {
  const failedValidation = !validationResult.success && validationResult.error !== undefined
  if (failedValidation) {
    const failureMessages = (validationResult.error?.issues ?? []).map((issue) => issue.message).join('; ')
    throw validationFailedError(failureMessages)
  }
}

// ---- Route factories --------------------------------------------------------

/**
 * Creates the idea route group.
 * Returns a Hono instance mounted under /api with:
 *   GET   /workspaces/:workspaceId/ideas    paginated board listing
 *   POST  /workspaces/:workspaceId/ideas    create an idea (stage: spark)
 *   GET   /ideas/:ideaId                    idea + comments (members only)
 *   PATCH /ideas/:ideaId                    update fields, scores, tags
 *   POST  /ideas/:ideaId/vote               toggle the caller's vote
 *   POST  /ideas/:ideaId/comments           add a comment
 */
export function createIdeaRoutes(currentUserResolver: CurrentUserResolver): Hono<AuthenticatedContext> {
  const ideaRoutes = new Hono<AuthenticatedContext>()

  ideaRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  ideaRoutes.get(
    '/workspaces/:workspaceId/ideas',
    zValidator('query', ideaListQuerySchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const listQuery = requestContext.req.valid('query')
      const database = createDatabase(requestContext.env.DATABASE)

      const listResponse = await listIdeasForWorkspaceMember(
        database,
        currentUser,
        requestContext.req.param('workspaceId'),
        listQuery,
      )
      return requestContext.json(ideaListResponseSchema.parse(listResponse))
    },
  )

  ideaRoutes.post(
    '/workspaces/:workspaceId/ideas',
    zValidator('json', createIdeaRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const ideaRequest = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const createdIdea = await createIdeaInWorkspace(
        database,
        currentUser,
        requestContext.req.param('workspaceId'),
        ideaRequest,
      )
      return requestContext.json({ idea: createdIdea }, 201)
    },
  )

  ideaRoutes.get('/ideas/:ideaId', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const database = createDatabase(requestContext.env.DATABASE)

    const detailResponse = await getIdeaDetailForMember(database, currentUser, requestContext.req.param('ideaId'))
    return requestContext.json(ideaDetailResponseSchema.parse(detailResponse))
  })

  ideaRoutes.patch(
    '/ideas/:ideaId',
    zValidator('json', updateIdeaRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const updateRequest = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      await updateIdeaForWorkspace(database, currentUser, requestContext.req.param('ideaId'), updateRequest)
      return requestContext.json({ ok: true })
    },
  )

  ideaRoutes.post('/ideas/:ideaId/vote', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const database = createDatabase(requestContext.env.DATABASE)

    const isNowVoted = await toggleIdeaVoteForMember(database, currentUser, requestContext.req.param('ideaId'))
    return requestContext.json({ isVotedByCurrentUser: isNowVoted })
  })

  ideaRoutes.post(
    '/ideas/:ideaId/comments',
    zValidator('json', createIdeaCommentRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const { commentText } = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const commentId = await addIdeaCommentForMember(database, currentUser, requestContext.req.param('ideaId'), commentText)
      return requestContext.json({ commentId }, 201)
    },
  )

  return ideaRoutes
}
