// =============================================================================
// FILE:    apps/worker/src/index.ts
// PURPOSE: Worker entry point. Exports the Hono application; Wrangler calls
//          its `fetch`. Durable Object classes will be exported from here as
//          the realtime phases land.
// USED BY: wrangler.jsonc ("main"), @cloudflare/vitest-pool-workers (SELF)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { createApplication } from './create-application'

// ---- Entry point ------------------------------------------------------------
export default createApplication()
