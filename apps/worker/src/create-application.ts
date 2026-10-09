// =============================================================================
// FILE:    apps/worker/src/create-application.ts
// PURPOSE: Builds the Hono application with every route mounted and the error
//          handler installed. Kept as a function (rather than a module side
//          effect) so tests can inject their own identity resolver while the
//          real entry point uses the production one.
// USED BY: apps/worker/src/index.ts, worker tests
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { EnvironmentBindings } from './configuration/environment-bindings'
import type { AuthenticatedContextVariables } from './auth/current-user-middleware'
import { createDefaultCurrentUserResolver } from './auth/current-user-resolver'
import type { CurrentUserResolver } from './auth/current-user-resolver'
import type { ApiError } from './routes/api-errors'
import { createHealthRoutes } from './routes/health-routes'
import { createMeRoutes } from './routes/me-routes'
import { createWorkspaceRoutes } from './routes/workspace-routes'
import { createWorkspaceInviteRoutes } from './routes/workspace-invite-routes'

// ---- Types ------------------------------------------------------------------

/** The fully-typed Hono application type used by every route and service. */
export type IdeoApplication = Hono<{
  Bindings: EnvironmentBindings
  Variables: AuthenticatedContextVariables
}>

/** Injectable behavior for tests: supply a fake identity resolver. */
export type ApplicationOptions = {
  currentUserResolver?: CurrentUserResolver | undefined
}

// ---- Factories --------------------------------------------------------------

/**
 * Creates the Hono application with all route groups mounted.
 * Returns the application, ready to be exported as the Worker entry point.
 */
export function createApplication(applicationOptions: ApplicationOptions = {}): IdeoApplication {
  const currentUserResolver = applicationOptions.currentUserResolver ?? createDefaultCurrentUserResolver()

  const application = new Hono<{
    Bindings: EnvironmentBindings
    Variables: AuthenticatedContextVariables
  }>()

  // Health stays public (no identity middleware mounted there).
  application.route('/api', createHealthRoutes())
  application.route('/api', createMeRoutes(currentUserResolver))
  application.route('/api', createWorkspaceRoutes(currentUserResolver))
  application.route('/api', createWorkspaceInviteRoutes(currentUserResolver))

  // Known errors become clean JSON; anything unexpected logs and answers 500
  // without leaking internals to the client.
  application.onError((thrownError, requestContext) => {
    const isKnownApiError = thrownError instanceof ApiError
    if (isKnownApiError) {
      const apiError = thrownError as ApiError
      return requestContext.json(
        { error: { code: apiError.errorCode, message: apiError.message } },
        apiError.statusCode,
      )
    }

    console.error('Unhandled worker error:', thrownError)
    return requestContext.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' } },
      500,
    )
  })

  return application
}
