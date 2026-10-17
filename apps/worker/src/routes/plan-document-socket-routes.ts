// =============================================================================
// FILE:    apps/worker/src/routes/plan-document-socket-routes.ts
// PURPOSE: The WebSocket endpoint for a plan's collaborative notes. The route
//          does what every route does — resolve identity, check membership —
//          then hands the upgrade to the plan's document room. Notes frames
//          themselves are binary Yjs protocol messages, handled by the room.
// USED BY: create-application.ts (mounted at /ws)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createDatabase } from '../database/create-database'
import { findPlanByIdWithCreator } from '../database/plan-queries'
import { findWorkspaceMember } from '../database/workspace-member-queries'
import { workspaceAccessDeniedError } from './api-errors'

// ---- Route factories --------------------------------------------------------

/**
 * Creates the plan document route group.
 * Returns a Hono instance mounted under /ws with:
 *   GET /plans/:planId/document    the collaborative notes room (members only)
 */
export function createPlanDocumentSocketRoutes(
  currentUserResolver: CurrentUserResolver,
): Hono<AuthenticatedContext> {
  const documentSocketRoutes = new Hono<AuthenticatedContext>()

  documentSocketRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  documentSocketRoutes.get('/plans/:planId/document', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const planId = requestContext.req.param('planId')
    const database = createDatabase(requestContext.env.DATABASE)

    // Same gate as every plan-scoped endpoint: the plan must exist and the
    // caller must belong to its workspace (404 either way, so outsiders
    // cannot probe plan ids).
    const foundPlan = await findPlanByIdWithCreator(database, planId)
    if (!foundPlan) throw workspaceAccessDeniedError()
    const membership = await findWorkspaceMember(
      database,
      foundPlan.plan.workspaceId,
      currentUser.id,
    )
    if (!membership) throw workspaceAccessDeniedError()

    const isWebSocketUpgrade = requestContext.req.raw.headers.get('upgrade') === 'websocket'
    if (!isWebSocketUpgrade) {
      return requestContext.json(
        { error: { code: 'WEBSOCKET_REQUIRED', message: 'Connect with a WebSocket.' } },
        426,
      )
    }

    const documentNamespace = requestContext.env.PLAN_DOCUMENT_ROOM
    const documentStub = documentNamespace.get(documentNamespace.idFromName(planId))
    return documentStub.fetch('https://document.internal/connect', {
      method: 'GET', // upgrades are GET; the room normalizes any method anyway
      headers: { upgrade: 'websocket' },
    })
  })

  return documentSocketRoutes
}
