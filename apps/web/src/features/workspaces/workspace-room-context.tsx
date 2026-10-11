// =============================================================================
// FILE:    apps/web/src/features/workspaces/workspace-room-context.tsx
// PURPOSE: The app's one live connection to the selected workspace's room,
//          provided app-wide so every page (board, plans, later sessions)
//          sees updates and presence without managing sockets itself.
// USED BY: app/application-providers.tsx (mount), feature pages (consume)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { createContext, type ReactNode, useContext } from 'react'
import { useSelectedWorkspace } from './hooks/use-selected-workspace'
import type { WorkspaceRoomConnection } from './hooks/use-workspace-room'
import { useWorkspaceRoom } from './hooks/use-workspace-room'

// ---- Context ----------------------------------------------------------------

/** The connection is always present below the provider; null is a wiring bug. */
const WorkspaceRoomContext = createContext<WorkspaceRoomConnection | null>(null)

// ---- Provider ---------------------------------------------------------------

/** Opens the room for the selected workspace and shares it app-wide. */
export function WorkspaceRoomProvider({ children }: { children: ReactNode }) {
  const { selectedWorkspaceId } = useSelectedWorkspace()
  const roomConnection = useWorkspaceRoom(selectedWorkspaceId)

  return (
    <WorkspaceRoomContext.Provider value={roomConnection}>{children}</WorkspaceRoomContext.Provider>
  )
}

// ---- Hook --------------------------------------------------------------------

/**
 * Reads the app-wide room connection.
 * Returns { viewers, isConnected, sendViewing }.
 */
export function useWorkspaceRoomConnection(): WorkspaceRoomConnection {
  const roomConnection = useContext(WorkspaceRoomContext)
  if (roomConnection === null) {
    throw new Error('useWorkspaceRoomConnection must be used below WorkspaceRoomProvider.')
  }
  return roomConnection
}
