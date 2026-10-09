// =============================================================================
// FILE:    apps/web/src/features/ideas/hooks/use-idea-detail.ts
// PURPOSE: Loads one idea with its comments for the drawer.
// USED BY: idea-detail-drawer.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useQuery } from '@tanstack/react-query'
import { fetchIdeaDetail } from '../api/idea-api'

// ---- Constants --------------------------------------------------------------

/** Cache key prefix for idea details. */
export const IDEA_DETAIL_QUERY_KEY_PREFIX = 'idea'

// ---- Hooks ------------------------------------------------------------------

/**
 * Loads an idea and its comments, oldest first.
 * Returns the TanStack Query result; disabled while ideaId is null.
 */
export function useIdeaDetail(ideaId: string | null) {
  return useQuery({
    queryKey: [IDEA_DETAIL_QUERY_KEY_PREFIX, ideaId],
    queryFn: () => fetchIdeaDetail(ideaId),
    enabled: ideaId !== null,
  })
}
