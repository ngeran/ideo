// =============================================================================
// FILE:    apps/worker/tests/test-helpers.ts
// PURPOSE: Shared helpers for endpoint tests: build user records for fake
//          identities, and create an application whose requests run as a given
//          user. Tests never touch the production identity resolver, so no
//          test backdoor exists in shipped code.
// USED BY: apps/worker/tests/*.test.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { env } from 'cloudflare:test'
import type { EnvironmentBindings } from '../src/configuration/environment-bindings'
import type { UserRecord } from '../src/configuration/record-types'
import { createApplication } from '../src/create-application'
import { createDatabase } from '../src/database/create-database'
import { insertUserIgnoringDuplicates } from '../src/database/user-queries'
import { authenticationRequiredError } from '../src/routes/api-errors'

// ---- Constants --------------------------------------------------------------

/** Deterministic test users; the color/name derivation mirrors production. */
const TEST_USER_DISPLAY_NAMES = ['Ada Testuser', 'Grace Testuser', 'Alan Testuser'] as const
const TEST_USER_COLORS = ['#0e7490', '#7c3aed', '#b45309'] as const

// ---- Factories --------------------------------------------------------------

/**
 * Builds a deterministic fake user record (never inserted unless a test does
 * so explicitly).
 * Returns the user record for the given zero-based test user number.
 */
export function createTestUserRecord(userNumber: number): UserRecord {
  const displayName = TEST_USER_DISPLAY_NAMES[userNumber % TEST_USER_DISPLAY_NAMES.length]
  return {
    id: `test-user-${userNumber}`,
    email: `user${userNumber}@ideo.test`,
    displayName: displayName ?? `Test User ${userNumber}`,
    avatarColor: TEST_USER_COLORS[userNumber % TEST_USER_COLORS.length] ?? '#0e7490',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

/**
 * Creates an application whose every request authenticates as `currentUser`.
 * Returns the app plus a helper for JSON requests against the test env.
 */
export function createTestApplicationForUser(currentUser: UserRecord) {
  const testEnvironment = env as unknown as EnvironmentBindings
  const application = createApplication({
    // Mirrors production: the resolver guarantees the user row exists before
    // the request runs (idempotent, so repeat requests are cheap to reason
    // about under per-test rollback).
    currentUserResolver: async () => {
      await insertUserIgnoringDuplicates(createDatabase(testEnvironment.DATABASE), {
        id: currentUser.id,
        email: currentUser.email,
        displayName: currentUser.displayName,
        avatarColor: currentUser.avatarColor,
        createdAt: currentUser.createdAt,
      })
      return currentUser
    },
  })

  return {
    /**
     * Sends a JSON request to the app, authenticated as `currentUser`.
     * Returns the raw Response (tests assert status and parsed body).
     */
    async fetchAsUser(path: string, method: 'GET' | 'POST', jsonBody?: unknown): Promise<Response> {
      return application.request(
        path,
        {
          method,
          headers: jsonBody === undefined ? undefined : { 'content-type': 'application/json' },
          body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
        },
        testEnvironment,
      )
    },
  }
}

/**
 * Creates an application whose identity resolution always fails — the same
 * code path a real request with no Access token and no dev fallback takes.
 * Returns the same fetch helper shape as createTestApplicationForUser.
 */
export function createTestApplicationWithoutIdentity() {
  const application = createApplication({
    currentUserResolver: async () => {
      throw authenticationRequiredError()
    },
  })
  const testEnvironment = env as unknown as EnvironmentBindings

  return {
    async fetchAsUser(path: string, method: 'GET' | 'POST', jsonBody?: unknown): Promise<Response> {
      return application.request(
        path,
        {
          method,
          headers: jsonBody === undefined ? undefined : { 'content-type': 'application/json' },
          body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
        },
        testEnvironment,
      )
    },
  }
}
