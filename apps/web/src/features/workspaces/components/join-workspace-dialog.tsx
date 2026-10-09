// =============================================================================
// FILE:    apps/web/src/features/workspaces/components/join-workspace-dialog.tsx
// PURPOSE: Dialog for joining a workspace by pasting an invite code (with or
//          without separators — the server normalizes the format).
// USED BY: workspace-switcher.tsx, overview page empty state, /join route
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
import { useJoinWorkspace } from '../hooks/use-workspace-mutations'

// ---- Types ------------------------------------------------------------------
export type JoinWorkspaceDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** Called with the joined workspace id after a successful join. */
  onWorkspaceJoined: (workspaceId: string) => void
  /** Optional pre-filled code (from an invite link like /join?code=XXXX). */
  initialInviteCode?: string
}

// ---- Component --------------------------------------------------------------

/** Modal form that joins a workspace via invite code. */
export function JoinWorkspaceDialog({
  isOpen,
  onOpenChange,
  onWorkspaceJoined,
  initialInviteCode = '',
}: JoinWorkspaceDialogProps) {
  const [inviteCode, setInviteCode] = useState(initialInviteCode)
  const joinWorkspace = useJoinWorkspace(onWorkspaceJoined)

  async function handleJoinClick() {
    await joinWorkspace.mutateAsync({ inviteCode })
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Join a workspace</DialogTitle>
        <DialogDescription>Paste the invite code a teammate shared with you.</DialogDescription>
        <form
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault()
            void handleJoinClick()
          }}
          className="flex flex-col gap-4"
        >
          <Input
            value={inviteCode}
            onChange={(changeEvent) => setInviteCode(changeEvent.target.value)}
            placeholder="e.g. K7P2-M4NX-9QRT"
            aria-label="Invite code"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={joinWorkspace.isPending}
              disabled={inviteCode.trim().length === 0}
            >
              Join workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
