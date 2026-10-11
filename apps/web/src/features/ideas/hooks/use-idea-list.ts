// =============================================================================
// FILE:    apps/web/src/features/ideas/hooks/use-idea-list.ts
// PURPOSE: Loads the board page by page for the current filters. The cache key
//          carries the workspace and filters, so switching stage chips or sort
//          never mixes results; the cursor chain only ever extends.
// USED BY: idea-board-page.tsx
// =============================================================================

import type { IdeaSortValue, IdeaStage } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchIdeaList } from '../api/idea-api'

// ---- Types ------------------------------------------------------------------

/** The board filters a page of ideas belongs to. */
export type IdeaListFilters = {
  stage: IdeaStage | 'all'
  sort: IdeaSortValue
}

// ---- Constants --------------------------------------------------------------

/** Cache key prefix for board pages. */
export const IDEA_LIST_QUERY_KEY_PREFIX = 'ideas'

// ---- Hooks ------------------------------------------------------------------

/**
 * Loads the board for the given workspace and filters, one cursor page at a
 * time. Returns the TanStack infinite query result; disabled while
 * workspaceId is null. `data.pages` holds the fetched pages in order.
 */
export function useIdeaList(workspaceId: string | null, filters: IdeaListFilters) {
  return useInfiniteQuery({
    queryKey: [IDEA_LIST_QUERY_KEY_PREFIX, workspaceId, filters],
    queryFn: ({ pageParam }) => {
      // The query is disabled while workspaceId is null; this guard keeps types honest.
      if (workspaceId === null) throw new Error('Cannot load the board without a workspace.')
      return fetchIdeaList(workspaceId, {
        stage: filters.stage === 'all' ? undefined : filters.stage,
        sort: filters.sort,
        cursor: pageParam,
      })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: workspaceId !== null,
  })
}
