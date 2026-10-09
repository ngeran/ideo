// =============================================================================
// FILE:    apps/web/vite.config.ts
// PURPOSE: Vite configuration for the Ideo single-page app. In development it
//          proxies /api and /ws to `wrangler dev` so one origin serves both
//          the app (Vite, with hot reload) and the API (workerd).
// USED BY: `pnpm dev` and `pnpm build` (see apps/web/package.json)
// =============================================================================

import tailwindcss from '@tailwindcss/vite'
// ---- Imports ----------------------------------------------------------------
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ---- Constants --------------------------------------------------------------

/** Where `wrangler dev` listens; the worker package's dev script uses 8787. */
const WORKER_DEV_ORIGIN = 'http://localhost:8787'

// ---- Configuration ----------------------------------------------------------
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // JSON API requests go to the Worker as-is.
      '/api': WORKER_DEV_ORIGIN,
      // WebSocket upgrades need the ws:// scheme and the ws flag.
      '/ws': {
        target: WORKER_DEV_ORIGIN.replace('http', 'ws'),
        ws: true,
      },
    },
  },
})
