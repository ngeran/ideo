// =============================================================================
// FILE:    apps/worker/tests/test-environment.d.ts
// PURPOSE: Declares the bindings tests can see at runtime (wrangler.jsonc plus
//          the TEST_D1_MIGRATIONS binding injected by vitest.config.ts), so
//          `env` from 'cloudflare:test' is fully typed.
// USED BY: TypeScript only — picked up via the tests folder include.
// =============================================================================

import type { D1Migration } from '@cloudflare/vitest-plugin'

declare global {
  namespace Cloudflare {
    interface Env {
      DATABASE: D1Database
      TEST_D1_MIGRATIONS: D1Migration[]
    }
  }
}
