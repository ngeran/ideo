// =============================================================================
// FILE:    apps/web/src/features/plans/hooks/use-plan-list.ts
// PURPOSE: Loads the workspace's plans page by page. The cache key carries
//          the workspace id, and realtime plan events invalidate it.
// USED BY: plans-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchPlanList } from '../api/plan-api'

// ---- Constants --------------------------------------------------------------

/** Cache key prefix for plan lists. */
export const PLAN_LIST_QUERY_KEY_PREFIX = 'plans'

// ---- Hooks ------------------------------------------------------------------

/**
 * Loads the workspace's plans, one cursor page at a time.
 * Returns the TanStack infinite query result; disabled while workspaceId is
 * null.
 */
export function usePlanList(workspaceId: string | null) {
  return useInfiniteQuery({
    queryKey: [PLAN_LIST_QUERY_KEY_PREFIX, workspaceId],
    queryFn: ({ pageParam }) => {
      // The query is disabled while workspaceId is null; this guard keeps types honest.
      if (workspaceId === null) throw new Error('Cannot load plans without a workspace.')
      return fetchPlanList(workspaceId, { cursor: pageParam })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: workspaceId !== null,
  })
}
