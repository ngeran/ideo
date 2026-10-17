// =============================================================================
// FILE:    apps/web/vite.config.ts
// PURPOSE: Vite configuration for the Ideo single-page app. In development it
//          proxies /api and /ws to `wrangler dev` so one origin serves both
//          the app (Vite, with hot reload) and the API (workerd). The build
//          emits a PWA: precached app shell, network-first API reads, and
//          never a cached WebSocket.
// USED BY: `pnpm dev` and `pnpm build` (see apps/web/package.json)
// =============================================================================

import tailwindcss from '@tailwindcss/vite'
// ---- Imports ----------------------------------------------------------------
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// ---- Constants --------------------------------------------------------------

/** Where `wrangler dev` listens; the worker package's dev script uses 8787. */
const WORKER_DEV_ORIGIN = 'http://localhost:8787'

// ---- Configuration ----------------------------------------------------------
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New service workers activate as soon as they are ready.
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Ideo',
        short_name: 'Ideo',
        description: "A private space for your team's ideas, brainstorms, plans, and tasks.",
        theme_color: '#007a80',
        background_color: '#f6f8f9',
        display: 'standalone',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // Unknown navigations fall back to the app shell — except the API and
        // the WebSocket, which must always reach the Worker.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/ws\//],
        runtimeCaching: [
          {
            // API reads are network-first: fresh when online, cached when
            // offline. Mutations are never cached (POST/PATCH always pass).
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            method: 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ideo-api-reads',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
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
