// =============================================================================
// FILE:    apps/worker/src/routes/workspace-socket-routes.ts
// PURPOSE: The WebSocket endpoint for a workspace's realtime room. The route
//          does exactly what every other route does — resolve identity, check
//          membership — and then hands the upgrade to the workspace's room
//          object instead of answering JSON.
// USED BY: create-application.ts (mounted at /ws)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createDatabase } from '../database/create-database'
import { findWorkspaceMember } from '../database/workspace-member-queries'
import { workspaceAccessDeniedError } from './api-errors'

// ---- Route factories --------------------------------------------------------

/**
 * Creates the WebSocket route group.
 * Returns a Hono instance mounted under /ws with:
 *   GET /workspaces/:workspaceId/room    the realtime room (members only)
 */
export function createWorkspaceSocketRoutes(
  currentUserResolver: CurrentUserResolver,
): Hono<AuthenticatedContext> {
  const socketRoutes = new Hono<AuthenticatedContext>()

  socketRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  socketRoutes.get('/workspaces/:workspaceId/room', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const workspaceId = requestContext.req.param('workspaceId')
    const database = createDatabase(requestContext.env.DATABASE)

    // Same gate as every workspace-scoped endpoint: membership or 403.
    const membership = await findWorkspaceMember(database, workspaceId, currentUser.id)
    if (!membership) throw workspaceAccessDeniedError()

    const isWebSocketUpgrade = requestContext.req.raw.headers.get('upgrade') === 'websocket'
    if (!isWebSocketUpgrade) {
      return requestContext.json(
        { error: { code: 'WEBSOCKET_REQUIRED', message: 'Connect with a WebSocket.' } },
        426,
      )
    }

    // The room is per workspace (idFromName); identity rides in internal
    // headers that only this Worker can set on a room stub's request.
    const roomNamespace = requestContext.env.WORKSPACE_ROOM
    const roomStub = roomNamespace.get(roomNamespace.idFromName(workspaceId))
    return roomStub.fetch('https://room.internal/connect', {
      method: 'GET', // upgrades are GET; the room normalizes any method anyway
      headers: {
        upgrade: 'websocket',
        'x-ideo-user-id': currentUser.id,
        'x-ideo-user-name': encodeURIComponent(currentUser.displayName),
        'x-ideo-user-color': currentUser.avatarColor,
      },
    })
  })

  return socketRoutes
}
