// =============================================================================
// FILE:    apps/web/src/features/sessions/hooks/use-session-detail.ts
// PURPOSE: Loads one brainstorm session with its sparks. Realtime session
//          events invalidate this cache entry.
// USED BY: sessions-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useQuery } from '@tanstack/react-query'
import { fetchSessionDetail } from '../api/session-api'

// ---- Constants --------------------------------------------------------------

/** Cache key prefix for session details. */
export const SESSION_DETAIL_QUERY_KEY_PREFIX = 'session'

// ---- Hooks ------------------------------------------------------------------

/**
 * Loads a session and its sparks.
 * Returns the TanStack Query result; disabled while sessionId is null.
 */
export function useSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: [SESSION_DETAIL_QUERY_KEY_PREFIX, sessionId],
    queryFn: () => {
      // The query is disabled while sessionId is null; this guard keeps types honest.
      if (sessionId === null) throw new Error('Cannot load a session without an id.')
      return fetchSessionDetail(sessionId)
    },
    enabled: sessionId !== null,
  })
}
