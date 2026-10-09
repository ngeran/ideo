// =============================================================================
// FILE:    apps/worker/tests/apply-database-migrations.ts
// PURPOSE: Vitest global setup: applies the committed D1 migrations to the
//          test database once, before any test runs. Per-test isolated storage
//          then rolls back each test's writes onto this migrated base.
// USED BY: vitest.config.ts (setupFiles)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { applyD1Migrations, env } from 'cloudflare:test'

// ---- Setup ------------------------------------------------------------------
await applyD1Migrations(env.DATABASE, env.TEST_D1_MIGRATIONS)
