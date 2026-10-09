// =============================================================================
// FILE:    apps/worker/vitest.config.ts
// PURPOSE: Vitest configuration that runs tests inside real workerd via the
//          official Cloudflare plugin, reading the committed wrangler.jsonc so
//          the tests see the same bindings (D1, assets) as production.
// USED BY: `pnpm test` (root and worker package)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

// ---- Configuration ----------------------------------------------------------
export default defineConfig({
  plugins: [
    cloudflareTest({
      // The root config is the single source of truth for bindings; the web
      // app must be built first so the assets directory exists.
      wrangler: { configPath: '../../wrangler.jsonc' },
    }),
  ],
})
