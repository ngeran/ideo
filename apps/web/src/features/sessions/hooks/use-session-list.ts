// =============================================================================
// FILE:    apps/web/src/features/sessions/hooks/use-session-list.ts
// PURPOSE: Loads the workspace's brainstorm sessions page by page. Realtime
//          session events invalidate this cache entry.
// USED BY: sessions-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchSessionList } from '../api/session-api'

// ---- Constants --------------------------------------------------------------

/** Cache key prefix for session lists. */
export const SESSION_LIST_QUERY_KEY_PREFIX = 'sessions'

// ---- Hooks ------------------------------------------------------------------

/**
 * Loads the workspace's sessions, one cursor page at a time.
 * Returns the TanStack infinite query result; disabled while workspaceId is
 * null.
 */
export function useSessionList(workspaceId: string | null) {
  return useInfiniteQuery({
    queryKey: [SESSION_LIST_QUERY_KEY_PREFIX, workspaceId],
    queryFn: ({ pageParam }) => {
      // The query is disabled while workspaceId is null; this guard keeps types honest.
      if (workspaceId === null) throw new Error('Cannot load sessions without a workspace.')
      return fetchSessionList(workspaceId, { cursor: pageParam })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: workspaceId !== null,
  })
}
