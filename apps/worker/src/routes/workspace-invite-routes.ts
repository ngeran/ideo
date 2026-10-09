// =============================================================================
// FILE:    apps/worker/src/routes/workspace-invite-routes.ts
// PURPOSE: POST /api/workspaces/:workspaceId/invites — members create invite
//          codes for teammates. Membership is checked before anything else.
// USED BY: create-application.ts (mounted at /api)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import { createWorkspaceInviteRequestSchema } from '@ideo/shared'
import type { WorkspaceInviteResponse } from '@ideo/shared'
import { createDatabase } from '../database/create-database'
import { findWorkspaceForMember } from '../database/workspace-queries'
import { createWorkspaceInviteForWorkspace } from '../services/invite-service'
import { workspaceAccessDeniedError, validationFailedError } from './api-errors'

// ---- Validation helpers -----------------------------------------------------

/** Turns a failed body validation into our standard error body. */
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
 * Creates the invite route group.
 * Returns a Hono instance mounted under /api with:
 *   POST /workspaces/:workspaceId/invites   create an invite (members only)
 */
export function createWorkspaceInviteRoutes(currentUserResolver: CurrentUserResolver): Hono<AuthenticatedContext> {
  const inviteRoutes = new Hono<AuthenticatedContext>()

  inviteRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  inviteRoutes.post(
    '/workspaces/:workspaceId/invites',
    zValidator('json', createWorkspaceInviteRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const workspaceId = requestContext.req.param('workspaceId')
      const inviteOptions = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const membership = await findWorkspaceForMember(database, workspaceId, currentUser.id)
      if (!membership) throw workspaceAccessDeniedError()

      const createdInvite = await createWorkspaceInviteForWorkspace(
        database,
        currentUser,
        workspaceId,
        membership.workspace.name,
        inviteOptions,
      )

      const inviteResponse: WorkspaceInviteResponse = {
        inviteCode: createdInvite.inviteCode,
        expiresAt: createdInvite.expiresAt,
        maximumUses: createdInvite.maximumUses,
      }
      return requestContext.json({ invite: inviteResponse }, 201)
    },
  )

  return inviteRoutes
}
