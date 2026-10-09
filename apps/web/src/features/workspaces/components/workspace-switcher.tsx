// =============================================================================
// FILE:    apps/web/src/features/workspaces/components/workspace-switcher.tsx
// PURPOSE: The workspace picker in the chrome: lists the user's workspaces,
//          switches between them, and opens the create/join dialogs. Owns the
//          selected-workspace memory.
// USED BY: app-sidebar.tsx (desktop), app-topbar.tsx (mobile)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useNavigate } from '@tanstack/react-router'
import { ChevronsUpDown, Plus, UserRoundPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../shared/components/ui/dropdown-menu'
import { useCurrentUser } from '../hooks/use-current-user'
import { saveSelectedWorkspaceId } from '../selected-workspace-storage'
import { CreateWorkspaceDialog } from './create-workspace-dialog'
import { JoinWorkspaceDialog } from './join-workspace-dialog'

// ---- Types ------------------------------------------------------------------
export type WorkspaceSwitcherProps = {
  /** Shown while memberships are loading or none exist yet. */
  fallbackLabel?: string
}

// ---- Component --------------------------------------------------------------

/**
 * Button + menu for picking the active workspace.
 * Selecting one remembers it and navigates to its page.
 */
export function WorkspaceSwitcher({ fallbackLabel = 'No workspace yet' }: WorkspaceSwitcherProps) {
  const navigate = useNavigate()
  const currentUserQuery = useCurrentUser()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)

  const workspaces = currentUserQuery.data?.workspaces ?? []
  const activeWorkspaceName =
    workspaces.length > 0 ? (workspaces[0]?.name ?? fallbackLabel) : fallbackLabel

  function selectWorkspace(workspaceId: string) {
    saveSelectedWorkspaceId(workspaceId)
    onOpenDialogsClosed()
    void navigate({ to: '/workspaces/$workspaceId', params: { workspaceId } })
  }

  function onOpenDialogsClosed() {
    setIsCreateDialogOpen(false)
    setIsJoinDialogOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            aria-label="Switch workspace"
            className="w-full justify-between font-medium"
            size="md"
          >
            <span className="min-w-0 truncate">{activeWorkspaceName}</span>
            <ChevronsUpDown className="size-4 text-muted" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem key={workspace.id} onSelect={() => selectWorkspace(workspace.id)}>
              {workspace.name}
            </DropdownMenuItem>
          ))}
          {workspaces.length > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuItem onSelect={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4" aria-hidden /> New workspace
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsJoinDialogOpen(true)}>
            <UserRoundPlus className="size-4" aria-hidden /> Join with code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onWorkspaceCreated={selectWorkspace}
      />
      <JoinWorkspaceDialog
        isOpen={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
        onWorkspaceJoined={selectWorkspace}
      />
    </>
  )
}
