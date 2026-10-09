// =============================================================================
// FILE:    apps/worker/src/configuration/environment-bindings.ts
// PURPOSE: The typed shape of the Worker's runtime bindings and variables,
//          matching wrangler.jsonc and .dev.vars. Every route and service uses
//          these as its generic, so a typo'd binding name is a compile error.
// USED BY: create-application.ts, auth/, routes/, services/, database/
// =============================================================================

// ---- Types ------------------------------------------------------------------

/**
 * Runtime bindings declared in wrangler.jsonc plus configuration variables.
 * Keep this in lockstep with those files — Wrangler injects the values.
 */
export type EnvironmentBindings = {
  /** Serving the built single-page app (see the "assets" block). */
  STATIC_ASSETS: Fetcher
  /** The D1 database (see the "d1_databases" block). */
  DATABASE: D1Database

  /**
   * "production" in wrangler.jsonc, "development" in .dev.vars. The dev
   * identity fallback refuses to run unless this is NOT "production", so a
   * leaked developer variable can never weaken production auth.
   */
  ENVIRONMENT: string
  /** Dev-only identity: when set (and ENVIRONMENT is not "production"),
   *  every request is attributed to this email. Lives in .dev.vars only. */
  DEVELOPMENT_USER_EMAIL?: string | undefined
  /** Cloudflare Access team domain, e.g. "myteam.cloudflareaccess.com". */
  ACCESS_TEAM_DOMAIN?: string | undefined
  /** Cloudflare Access application AUD tag — checked against the JWT. */
  ACCESS_AUD?: string | undefined
}
