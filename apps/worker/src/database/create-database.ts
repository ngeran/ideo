// =============================================================================
// FILE:    apps/worker/src/database/create-database.ts
// PURPOSE: Wraps the D1 binding in a typed Drizzle client. All query files
//          receive this client, keeping SQL access in one layer.
// USED BY: routes and services via request context bindings
// =============================================================================

import type { DrizzleD1Database } from 'drizzle-orm/d1'
// ---- Imports ----------------------------------------------------------------
import type { BatchItem } from 'drizzle-orm/batch'
import { drizzle } from 'drizzle-orm/d1'
import * as drizzleSchema from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** The Drizzle client type used across the database layer. */
export type IdeoDatabase = DrizzleD1Database<typeof drizzleSchema>

// ---- Helpers --------------------------------------------------------------

/**
 * Converts a statement array into the tuple D1's batch requires, failing fast
 * when a service accidentally built no statements.
 * Returns the non-empty statement tuple.
 */
export function asBatchStatements(
  statements: BatchItem<'sqlite'>[],
): [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]] {
  const [firstStatement, ...remainingStatements] = statements
  if (!firstStatement) throw new Error('database.batch needs at least one statement')
  return [firstStatement, ...remainingStatements]
}

// ---- Factories --------------------------------------------------------------

/**
 * Creates a Drizzle client over a D1 binding.
 * Returns the typed client used by every query function.
 */
export function createDatabase(d1Binding: D1Database): IdeoDatabase {
  return drizzle(d1Binding, { schema: drizzleSchema })
}
