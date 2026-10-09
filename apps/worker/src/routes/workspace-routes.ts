// =============================================================================
// FILE:    apps/worker/src/routes/workspace-routes.ts
// PURPOSE: Workspace lifecycle endpoints: create, join with an invite code,
//          and read one workspace with its members. Membership is checked on
//          every workspace-scoped read; unknown-or-not-a-member is one 404.
// USED BY: create-application.ts (mounted at /api)
// =============================================================================

import { zValidator } from '@hono/zod-validator'
import { createWorkspaceRequestSchema, joinWorkspaceRequestSchema } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createDatabase } from '../database/create-database'
import { listWorkspaceMembers } from '../database/workspace-member-queries'
import { findWorkspaceForMember } from '../database/workspace-queries'
import {
  createWorkspaceOwnedByUser,
  joinWorkspaceWithInviteCode,
} from '../services/workspace-service'
import { validationFailedError, workspaceAccessDeniedError } from './api-errors'
import { buildWorkspaceMemberResponse, buildWorkspaceResponse } from './response-builders'

// ---- Validation helpers -----------------------------------------------------

/** Turns a failed body validation into our standard error body. */
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
 * Creates the workspace route group.
 * Returns a Hono instance mounted under /api with:
 *   POST /workspaces              create a workspace (caller becomes owner)
 *   POST /workspaces/join         join with an invite code
 *   GET  /workspaces/:workspaceId workspace + members (members only)
 */
export function createWorkspaceRoutes(
  currentUserResolver: CurrentUserResolver,
): Hono<AuthenticatedContext> {
  const workspaceRoutes = new Hono<AuthenticatedContext>()

  workspaceRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  workspaceRoutes.post(
    '/workspaces',
    zValidator('json', createWorkspaceRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const { name } = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const createdWorkspace = await createWorkspaceOwnedByUser(database, currentUser, name)

      return requestContext.json(
        { workspace: buildWorkspaceResponse(createdWorkspace, 'owner') },
        201,
      )
    },
  )

  workspaceRoutes.post(
    '/workspaces/join',
    zValidator('json', joinWorkspaceRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const { inviteCode } = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const joinedWorkspace = await joinWorkspaceWithInviteCode(database, currentUser, inviteCode)

      // The user is now a member by definition, so their role is "member".
      return requestContext.json(
        { workspace: buildWorkspaceResponse(joinedWorkspace, 'member') },
        200,
      )
    },
  )

  workspaceRoutes.get('/workspaces/:workspaceId', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const database = createDatabase(requestContext.env.DATABASE)

    const membership = await findWorkspaceForMember(
      database,
      requestContext.req.param('workspaceId'),
      currentUser.id,
    )
    // One 404 for "does not exist" and "not a member" — no information leak.
    if (!membership) throw workspaceAccessDeniedError()

    const members = await listWorkspaceMembers(database, membership.workspace.id)

    return requestContext.json({
      workspace: buildWorkspaceResponse(membership.workspace, membership.memberRole),
      members: members.map(buildWorkspaceMemberResponse),
    })
  })

  return workspaceRoutes
}
