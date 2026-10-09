// =============================================================================
// FILE:    apps/web/src/shared/lib/query-client.ts
// PURPOSE: The TanStack Query client with app-wide defaults. Server state
//          lives in TanStack Query only (skill rule 7.3), so its behavior is
//          configured in exactly one place.
// USED BY: app/application-providers.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { QueryClient } from '@tanstack/react-query'

// ---- Constants --------------------------------------------------------------

/** Shared-fair defaults for a small-team app on the D1 free tier. */
const QUERY_STALE_TIME_MS = 30_000
const QUERY_RETRY_COUNT = 1

// ---- Factories --------------------------------------------------------------

/**
 * Creates the application's QueryClient.
 * Returns a client tuned for calm, cache-friendly realtime invalidation:
 * short staleness (live updates invalidate anyway), one retry, no refetch
 * storms on window focus.
 */
export function createApplicationQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        retry: QUERY_RETRY_COUNT,
        refetchOnWindowFocus: false,
      },
    },
  })
}
