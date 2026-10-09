// =============================================================================
// FILE:    apps/worker/src/database/create-database.ts
// PURPOSE: Wraps the D1 binding in a typed Drizzle client. All query files
//          receive this client, keeping SQL access in one layer.
// USED BY: routes and services via request context bindings
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { drizzle } from 'drizzle-orm/d1'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import * as drizzleSchema from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** The Drizzle client type used across the database layer. */
export type IdeoDatabase = DrizzleD1Database<typeof drizzleSchema>

// ---- Factories --------------------------------------------------------------

/**
 * Creates a Drizzle client over a D1 binding.
 * Returns the typed client used by every query function.
 */
export function createDatabase(d1Binding: D1Database): IdeoDatabase {
  return drizzle(d1Binding, { schema: drizzleSchema })
}
