// =============================================================================
// FILE:    apps/web/src/features/activity/hooks/use-activity-list.ts
// PURPOSE: Loads the workspace's activity feed page by page. Every realtime
//          workspace event invalidates this cache entry, so the feed updates
//          live while the page is open.
// USED BY: activity-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchActivityList } from '../api/activity-api'

// ---- Constants --------------------------------------------------------------

/** Cache key prefix for activity pages. */
export const ACTIVITY_LIST_QUERY_KEY_PREFIX = 'activity'

// ---- Hooks ------------------------------------------------------------------

/**
 * Loads the activity feed, one cursor page at a time.
 * Returns the TanStack infinite query result; disabled while workspaceId is
 * null.
 */
export function useActivityList(workspaceId: string | null) {
  return useInfiniteQuery({
    queryKey: [ACTIVITY_LIST_QUERY_KEY_PREFIX, workspaceId],
    queryFn: ({ pageParam }) => {
      // The query is disabled while workspaceId is null; this guard keeps types honest.
      if (workspaceId === null) throw new Error('Cannot load activity without a workspace.')
      return fetchActivityList(workspaceId, { cursor: pageParam })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: workspaceId !== null,
  })
}
