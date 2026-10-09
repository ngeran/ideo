// =============================================================================
// FILE:    apps/worker/src/auth/current-user-middleware.ts
// PURPOSE: Hono middleware that resolves the current user before a route runs
//          and stores it on the context. Route groups that need an identity
//          mount this explicitly; the health route stays public.
// USED BY: routes/me-routes.ts, routes/workspace-routes.ts, and every
//          workspace-scoped route group
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { MiddlewareHandler } from 'hono'
import type { EnvironmentBindings } from '../configuration/environment-bindings'
import type { UserRecord } from '../configuration/record-types'
import type { CurrentUserResolver } from './current-user-resolver'

// ---- Types ------------------------------------------------------------------

/** The context variables the middleware guarantees for handlers. */
export type AuthenticatedContextVariables = {
  currentUser: UserRecord
}

/** The fully typed context every authenticated handler receives. */
export type AuthenticatedContext = {
  Bindings: EnvironmentBindings
  Variables: AuthenticatedContextVariables
}

// ---- Factories --------------------------------------------------------------

/**
 * Creates the middleware that resolves and stores the current user.
 * Returns a MiddlewareHandler; identity failures throw ApiError(401), which
 * the application error handler renders.
 */
export function createCurrentUserMiddleware(
  currentUserResolver: CurrentUserResolver,
): MiddlewareHandler<AuthenticatedContext> {
  return async (requestContext, next) => {
    const currentUser = await currentUserResolver(requestContext.req.raw, requestContext.env)
    requestContext.set('currentUser', currentUser)
    await next()
  }
}
