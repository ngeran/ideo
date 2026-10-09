// =============================================================================
// FILE:    apps/worker/src/database/user-queries.ts
// PURPOSE: SQL for reading and creating user rows. Identity resolution upserts
//          a user on first sign-in (Cloudflare Access email or dev fallback).
// USED BY: auth/current-user-resolver.ts, routes
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { eq } from 'drizzle-orm'
import type { UserRecord } from '../configuration/record-types'
import type { IdeoDatabase } from './create-database'
import { users } from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** Fields for inserting a new user. */
export type NewUserInput = {
  id: string
  email: string
  displayName: string
  avatarColor: string
}

// ---- Query functions --------------------------------------------------------

/**
 * Finds a user by their email address.
 * Returns the user record, or null when no user exists for that email.
 */
export async function findUserByEmail(database: IdeoDatabase, email: string): Promise<UserRecord | null> {
  const matchingRows = await database.select().from(users).where(eq(users.email, email)).limit(1)
  const matchingUser = matchingRows.at(0)
  return matchingUser ?? null
}

/**
 * Finds a user by their id.
 * Returns the user record, or null when the id is unknown.
 */
export async function findUserById(database: IdeoDatabase, userId: string): Promise<UserRecord | null> {
  const matchingRows = await database.select().from(users).where(eq(users.id, userId)).limit(1)
  const matchingUser = matchingRows.at(0)
  return matchingUser ?? null
}

/**
 * Inserts a user row. The email is unique, so a concurrent first sign-in is
 * absorbed by onConflictDoNothing instead of failing the request.
 * Returns nothing; callers re-read the row via findUserByEmail.
 */
export async function insertUserIgnoringDuplicates(database: IdeoDatabase, newUser: NewUserInput): Promise<void> {
  await database.insert(users).values(newUser).onConflictDoNothing({ target: [users.email] })
}
