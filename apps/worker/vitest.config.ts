// =============================================================================
// FILE:    apps/worker/vitest.config.ts
// PURPOSE: Vitest configuration that runs tests inside real workerd via the
//          official Cloudflare plugin. Reads the committed wrangler.jsonc for
//          bindings (D1, assets) and injects the D1 migrations as a binding so
//          the test setup can apply them to a fresh database.
// USED BY: `pnpm test` (root and worker package)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import path from 'node:path'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

// ---- Configuration ----------------------------------------------------------
export default defineConfig(async () => {
  // Read on the Node side, then hand to the worker as a plain binding.
  const d1Migrations = await readD1Migrations(path.join(import.meta.dirname, 'migrations'))

  return {
    plugins: [
      cloudflareTest({
        // The root config is the single source of truth for bindings; the
        // web app must be built first so the assets directory exists.
        wrangler: { configPath: '../../wrangler.jsonc' },
        miniflare: {
          bindings: { TEST_D1_MIGRATIONS: d1Migrations },
        },
      }),
    ],
    test: {
      setupFiles: ['./tests/apply-database-migrations.ts'],
    },
  }
})
