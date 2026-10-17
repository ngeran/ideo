// =============================================================================
// FILE:    apps/worker/src/routes/activity-routes.ts
// PURPOSE: The activity feed endpoint: a workspace's events, newest first,
//          paginated. Handlers stay thin — parse, delegate, respond.
// USED BY: create-application.ts (mounted at /api)
// =============================================================================

import { zValidator } from '@hono/zod-validator'
import { activityListQuerySchema, activityListResponseSchema } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createDatabase } from '../database/create-database'
import { listActivityForMember } from '../services/activity-service'
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
 * Creates the activity route group.
 * Returns a Hono instance mounted under /api with:
 *   GET /workspaces/:workspaceId/activity    paginated feed (members only)
 */
export function createActivityRoutes(
  currentUserResolver: CurrentUserResolver,
): Hono<AuthenticatedContext> {
  const activityRoutes = new Hono<AuthenticatedContext>()

  activityRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  activityRoutes.get(
    '/workspaces/:workspaceId/activity',
    zValidator('query', activityListQuerySchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const listQuery = requestContext.req.valid('query')
      const database = createDatabase(requestContext.env.DATABASE)

      const listResponse = await listActivityForMember(
        database,
        currentUser,
        requestContext.req.param('workspaceId'),
        listQuery,
      )
      return requestContext.json(activityListResponseSchema.parse(listResponse))
    },
  )

  return activityRoutes
}
