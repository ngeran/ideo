// =============================================================================
// FILE:    apps/web/src/features/workspaces/hooks/use-current-user.ts
// PURPOSE: The single source of identity on the client: who is signed in and
//          which workspaces they belong to. Every component reads from this
//          one cache entry, so a join/create only has to invalidate 'me'.
// USED BY: workspace-switcher, overview page, workspace page
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useQuery } from '@tanstack/react-query'
import { ApiRequestError } from '../../../shared/lib/api-client'
import { fetchCurrentUser } from '../api/workspace-api'

// ---- Constants --------------------------------------------------------------

/** The one cache key for identity + memberships. */
export const CURRENT_USER_QUERY_KEY = ['me'] as const

// ---- Hooks ------------------------------------------------------------------

/**
 * Loads the current user and their workspaces.
 * Returns the TanStack Query result (data, isPending, error, refetch).
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUser,
    // A 401 (no identity configured) is a valid state to render, not a
    // retriable hiccup — never hammer the API for it.
    retry: (failureCount, queryError) => {
      const isUnauthorized = queryError instanceof ApiRequestError && queryError.statusCode === 401
      return isUnauthorized ? false : failureCount < 2
    },
  })
}
