// =============================================================================
// FILE:    apps/worker/src/routes/health-routes.ts
// PURPOSE: Liveness endpoints: lets deploys, monitors, and the local dev
//          scaffold confirm the Worker is up without touching the database.
// USED BY: apps/worker/src/create-application.ts (mounted at /api)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { EnvironmentBindings } from '../configuration/environment-bindings'

// ---- Route factories --------------------------------------------------------

/**
 * Creates the health route group.
 * Returns a Hono instance with `GET /health`.
 */
export function createHealthRoutes(): Hono<{ Bindings: EnvironmentBindings }> {
  const healthRoutes = new Hono<{ Bindings: EnvironmentBindings }>()

  healthRoutes.get('/health', (requestContext) => {
    return requestContext.json({
      status: 'ok',
      service: 'ideo-api',
      timestamp: new Date().toISOString(),
    })
  })

  return healthRoutes
}
