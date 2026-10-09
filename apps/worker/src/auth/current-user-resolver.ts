// =============================================================================
// FILE:    apps/worker/src/auth/current-user-resolver.ts
// PURPOSE: Resolves the identity behind a request to a user row:
//          1. Cloudflare Access JWT (production), or
//          2. DEVELOPMENT_USER_EMAIL (only when ENVIRONMENT is not
//             "production" — pinned to "production" in wrangler.jsonc).
//          The user row is created on first sign-in. Tests inject their own
//          resolver instead of this one, so no test backdoor ships.
// USED BY: create-application.ts (default), auth/current-user-middleware.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { EnvironmentBindings } from '../configuration/environment-bindings'
import type { UserRecord } from '../configuration/record-types'
import type { IdeoDatabase } from '../database/create-database'
import { createDatabase } from '../database/create-database'
import { findUserByEmail, insertUserIgnoringDuplicates } from '../database/user-queries'
import { authenticationRequiredError } from '../routes/api-errors'
import { deriveAvatarColorFromEmail, deriveDisplayNameFromEmail } from './user-profile-from-email'
import { verifyAccessToken } from './verify-access-token'

// ---- Types ------------------------------------------------------------------

/**
 * Resolves the current user for a request, creating the user row on first
 * sign-in. Throws ApiError(401) when the request carries no valid identity.
 */
export type CurrentUserResolver = (
  request: Request,
  bindings: EnvironmentBindings,
) => Promise<UserRecord>

// ---- Pure functions ---------------------------------------------------------

/**
 * Finds the user for an email, creating their row on first sign-in.
 * Returns the user record.
 */
async function resolveUserByEmail(database: IdeoDatabase, userEmail: string): Promise<UserRecord> {
  const existingUser = await findUserByEmail(database, userEmail)
  if (existingUser) return existingUser

  await insertUserIgnoringDuplicates(database, {
    id: crypto.randomUUID(),
    email: userEmail,
    displayName: deriveDisplayNameFromEmail(userEmail),
    avatarColor: deriveAvatarColorFromEmail(userEmail),
    createdAt: new Date().toISOString(),
  })

  // Re-read so the conflict winner (or our insert) comes back complete.
  const createdUser = await findUserByEmail(database, userEmail)
  if (!createdUser) throw new Error(`Failed to create user for ${userEmail}`)
  return createdUser
}

// ---- Factories --------------------------------------------------------------

/**
 * Creates the production identity resolver: Cloudflare Access JWT first,
 * dev email fallback only outside production.
 * Returns the resolver used by the real Worker entry point.
 */
export function createDefaultCurrentUserResolver(): CurrentUserResolver {
  return async (request, bindings) => {
    const database = createDatabase(bindings.DATABASE)

    // --- 1. Cloudflare Access (production path) -----------------------------
    const accessToken = request.headers.get('Cf-Access-Jwt-Assertion')
    if (
      accessToken !== null &&
      typeof bindings.ACCESS_TEAM_DOMAIN === 'string' &&
      typeof bindings.ACCESS_AUD === 'string'
    ) {
      const { userEmail } = await verifyAccessToken(
        accessToken,
        bindings.ACCESS_TEAM_DOMAIN,
        bindings.ACCESS_AUD,
      )
      return resolveUserByEmail(database, userEmail)
    }

    // --- 2. Development-only fallback ---------------------------------------
    // Doubly guarded: an explicit non-production ENVIRONMENT (pinned to
    // "production" in wrangler.jsonc) AND a developer-set email.
    const developmentUserEmail = bindings.DEVELOPMENT_USER_EMAIL
    const isDevelopmentMode =
      typeof developmentUserEmail === 'string' &&
      developmentUserEmail.length > 0 &&
      bindings.ENVIRONMENT !== 'production'

    if (isDevelopmentMode) {
      return resolveUserByEmail(database, developmentUserEmail)
    }

    // --- 3. Nothing worked ----------------------------------------------------
    throw authenticationRequiredError()
  }
}
