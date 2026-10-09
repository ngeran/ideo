// =============================================================================
// FILE:    apps/worker/src/routes/me-routes.ts
// PURPOSE: GET /api/me — the signed-in user plus their workspace memberships.
//          The web app calls this once on load for the workspace switcher.
// USED BY: create-application.ts (mounted at /api)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import { createDatabase } from '../database/create-database'
import { listWorkspacesForUser } from '../database/workspace-queries'
import { buildUserResponse, buildWorkspaceResponse } from './response-builders'

// ---- Route factories --------------------------------------------------------

/**
 * Creates the /me route group.
 * Returns a Hono instance with `GET /me` (authentication required).
 */
export function createMeRoutes(currentUserResolver: CurrentUserResolver): Hono<AuthenticatedContext> {
  const meRoutes = new Hono<AuthenticatedContext>()

  meRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  meRoutes.get('/me', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const database = createDatabase(requestContext.env.DATABASE)

    const memberships = await listWorkspacesForUser(database, currentUser.id)

    return requestContext.json({
      user: buildUserResponse(currentUser),
      workspaces: memberships.map((membership) =>
        buildWorkspaceResponse(membership.workspace, membership.memberRole),
      ),
    })
  })

  return meRoutes
}
