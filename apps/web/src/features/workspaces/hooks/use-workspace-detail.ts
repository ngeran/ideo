// =============================================================================
// FILE:    apps/web/src/features/workspaces/hooks/use-workspace-detail.ts
// PURPOSE: Loads one workspace with its members for the workspace page.
// USED BY: features/workspaces/components/workspace-page.tsx (via the router)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useQuery } from '@tanstack/react-query'
import { fetchWorkspaceDetail } from '../api/workspace-api'

// ---- Constants --------------------------------------------------------------

/** Cache key prefix; one entry per workspace id. */
export const WORKSPACE_DETAIL_QUERY_KEY_PREFIX = 'workspace-detail'

// ---- Hooks ------------------------------------------------------------------

/**
 * Loads a workspace and its member list.
 * Returns the TanStack Query result for the given workspace id.
 */
export function useWorkspaceDetail(workspaceId: string) {
  return useQuery({
    queryKey: [WORKSPACE_DETAIL_QUERY_KEY_PREFIX, workspaceId],
    queryFn: () => fetchWorkspaceDetail(workspaceId),
  })
}
