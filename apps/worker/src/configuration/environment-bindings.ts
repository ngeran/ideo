// =============================================================================
// FILE:    apps/worker/src/configuration/environment-bindings.ts
// PURPOSE: The typed shape of the Worker's runtime bindings, matching
//          wrangler.jsonc. Every route and service takes these as its generic,
//          so a typo'd binding name is a compile error, not a runtime one.
// USED BY: apps/worker/src/create-application.ts, all route and service files
// =============================================================================

// ---- Types ------------------------------------------------------------------

/**
 * Runtime bindings declared in wrangler.jsonc. Keep this in lockstep with that
 * file — Wrangler injects these values at runtime.
 */
export type EnvironmentBindings = {
  /** Serving the built single-page app (see the "assets" block). */
  STATIC_ASSETS: Fetcher
  /** The D1 database (see the "d1_databases" block). */
  DATABASE: D1Database
}
