// =============================================================================
// FILE:    apps/web/src/features/workspaces/selected-workspace-storage.ts
// PURPOSE: Remembers which workspace the device last looked at, so reopening
//          Ideo lands the user back in their team's space. Best-effort, like
//          theme storage: private-browsing failures never break the app.
// USED BY: workspace-switcher.tsx, workspace feature hooks
// =============================================================================

// ---- Constants --------------------------------------------------------------

/** localStorage key. Best-effort only — see theme-storage for the pattern. */
const SELECTED_WORKSPACE_STORAGE_KEY = 'ideo-selected-workspace'

// ---- Persistence helpers ----------------------------------------------------

/**
 * Reads the remembered workspace id.
 * Returns the id, or null when nothing valid is saved.
 */
export function readSelectedWorkspaceId(): string | null {
  try {
    const savedWorkspaceId = localStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY)
    const isPlausibleId = typeof savedWorkspaceId === 'string' && savedWorkspaceId.length > 0
    return isPlausibleId ? savedWorkspaceId : null
  } catch {
    return null
  }
}

/**
 * Remembers the workspace id for the next visit.
 * Swallows storage failures on purpose.
 */
export function saveSelectedWorkspaceId(workspaceId: string): void {
  try {
    localStorage.setItem(SELECTED_WORKSPACE_STORAGE_KEY, workspaceId)
  } catch {
    // Remembering is best-effort; the session still works without it.
  }
}
