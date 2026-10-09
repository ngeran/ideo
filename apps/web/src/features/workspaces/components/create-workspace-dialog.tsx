// =============================================================================
// FILE:    apps/web/src/features/workspaces/components/create-workspace-dialog.tsx
// PURPOSE: Dialog for naming and creating a workspace. On success the new
//          workspace is selected and the user is taken to it.
// USED BY: workspace-switcher.tsx, overview page empty state
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../shared/components/ui/dialog'
import { Input } from '../../../shared/components/ui/input'
import { useCreateWorkspace } from '../hooks/use-workspace-mutations'

// ---- Types ------------------------------------------------------------------
export type CreateWorkspaceDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** Called with the new workspace id after a successful creation. */
  onWorkspaceCreated: (workspaceId: string) => void
}

// ---- Component --------------------------------------------------------------

/** Modal form that creates a workspace. */
export function CreateWorkspaceDialog({
  isOpen,
  onOpenChange,
  onWorkspaceCreated,
}: CreateWorkspaceDialogProps) {
  const [workspaceName, setWorkspaceName] = useState('')
  const createWorkspace = useCreateWorkspace(onWorkspaceCreated)

  async function handleCreateClick() {
    await createWorkspace.mutateAsync({ name: workspaceName })
    onOpenChange(false)
    setWorkspaceName('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Create a workspace</DialogTitle>
        <DialogDescription>
          A workspace is a private space for one team. You can belong to several.
        </DialogDescription>
        <form
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault()
            void handleCreateClick()
          }}
          className="flex flex-col gap-4"
        >
          <Input
            value={workspaceName}
            onChange={(changeEvent) => setWorkspaceName(changeEvent.target.value)}
            placeholder="e.g. Product Guild"
            aria-label="Workspace name"
            maxLength={60}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createWorkspace.isPending}
              disabled={workspaceName.trim().length === 0}
            >
              Create workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
