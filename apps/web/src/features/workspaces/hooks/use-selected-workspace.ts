// =============================================================================
// FILE:    apps/web/src/features/workspaces/hooks/use-selected-workspace.ts
// PURPOSE: Resolves the workspace the user is currently working in: the
//          remembered choice when it is still valid, otherwise their only or
//          first workspace. Sections like the board build on this.
// USED BY: idea board, plans (phase 6), sessions (phase 8)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useEffect } from 'react'
import { readSelectedWorkspaceId, saveSelectedWorkspaceId } from '../selected-workspace-storage'
import { useCurrentUser } from './use-current-user'

// ---- Hooks ------------------------------------------------------------------

/**
 * Resolves the selected workspace id from the remembered choice and the
 * user's memberships, correcting stale memories automatically.
 * Returns { selectedWorkspaceId, workspaces, userQuery } — the id is null
 * while loading or when the user has no workspace yet.
 */
export function useSelectedWorkspace() {
  const userQuery = useCurrentUser()
  const workspaces = userQuery.data?.workspaces ?? []

  const rememberedWorkspaceId = readSelectedWorkspaceId()
  const isRememberedValid = workspaces.some((workspace) => workspace.id === rememberedWorkspaceId)
  const selectedWorkspaceId = isRememberedValid
    ? rememberedWorkspaceId
    : (workspaces[0]?.id ?? null)

  // Self-heal the memory so the next visit opens the same workspace again.
  useEffect(() => {
    if (selectedWorkspaceId !== null && selectedWorkspaceId !== rememberedWorkspaceId) {
      saveSelectedWorkspaceId(selectedWorkspaceId)
    }
  }, [selectedWorkspaceId, rememberedWorkspaceId])

  return { selectedWorkspaceId, workspaces, userQuery }
}
