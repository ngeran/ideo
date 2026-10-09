// =============================================================================
// FILE:    apps/web/src/features/ideas/hooks/use-idea-list.ts
// PURPOSE: Loads one page of the board for the current filters. The cache key
//          carries the workspace and filters, so switching stage chips or sort
//          never mixes results.
// USED BY: idea-board-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useQuery } from '@tanstack/react-query'
import type { IdeaSortValue, IdeaStage } from '@ideo/shared'
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
 * Loads the board page for the given workspace and filters.
 * Returns the TanStack Query result; disabled while workspaceId is null.
 */
export function useIdeaList(workspaceId: string | null, filters: IdeaListFilters) {
  return useQuery({
    queryKey: [IDEA_LIST_QUERY_KEY_PREFIX, workspaceId, filters],
    queryFn: () =>
      fetchIdeaList(workspaceId, {
        stage: filters.stage === 'all' ? undefined : filters.stage,
        sort: filters.sort,
      }),
    enabled: workspaceId !== null,
  })
}
