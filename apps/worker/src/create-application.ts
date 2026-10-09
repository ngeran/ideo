// =============================================================================
// FILE:    apps/worker/src/create-application.ts
// PURPOSE: Builds the Hono application with every route mounted. Kept as a
//          function (rather than a module side effect) so tests can build
//          their own instance and the entry file stays a one-liner.
// USED BY: apps/worker/src/index.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { EnvironmentBindings } from './configuration/environment-bindings'
import { createHealthRoutes } from './routes/health-routes'

// ---- Types ------------------------------------------------------------------

/** The fully-typed Hono application type used by every route and service. */
export type IdeoApplication = Hono<{ Bindings: EnvironmentBindings }>

// ---- Factories --------------------------------------------------------------

/**
 * Creates the Hono application with all route groups mounted.
 * Returns the application, ready to be exported as the Worker entry point.
 */
export function createApplication(): IdeoApplication {
  const application = new Hono<{ Bindings: EnvironmentBindings }>()

  application.route('/api', createHealthRoutes())

  return application
}
