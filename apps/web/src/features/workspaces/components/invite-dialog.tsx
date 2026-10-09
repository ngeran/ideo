// =============================================================================
// FILE:    apps/web/src/features/workspaces/components/invite-dialog.tsx
// PURPOSE: Creates an invite for the workspace and shows the resulting code
//          plus a shareable link, with a one-click copy.
// USED BY: workspace-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '../../../shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../shared/components/ui/dialog'
import { useCreateWorkspaceInvite } from '../hooks/use-workspace-mutations'

// ---- Types ------------------------------------------------------------------
export type InviteDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  workspaceId: string
}

// ---- Component helpers ------------------------------------------------------

/**
 * Formats a raw code for humans: K7P2M4NX9QRT -> K7P2-M4NX-9QRT.
 * Returns the grouped display string.
 */
function formatInviteCodeForDisplay(rawInviteCode: string): string {
  return rawInviteCode.replace(/(.{4})/g, '$1-').replace(/-$/, '')
}

// ---- Component --------------------------------------------------------------

/** Modal that mints an invite and displays the code + link. */
export function InviteDialog({ isOpen, onOpenChange, workspaceId }: InviteDialogProps) {
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null)
  const [hasCopiedCode, setHasCopiedCode] = useState(false)
  const createWorkspaceInvite = useCreateWorkspaceInvite(setCreatedInviteCode)

  async function handleCreateInviteClick() {
    setHasCopiedCode(false)
    await createWorkspaceInvite.mutateAsync({ workspaceId })
  }

  async function copyInviteTextToClipboard() {
    if (createdInviteCode === null) return
    const joinLink = `${window.location.origin}/join?code=${createdInviteCode}`
    await navigator.clipboard.writeText(
      `Join my Ideo workspace: ${joinLink} (code ${formatInviteCodeForDisplay(createdInviteCode)})`,
    )
    setHasCopiedCode(true)
    toast.success('Invite copied to your clipboard.')
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(dialogIsOpen) => {
        if (!dialogIsOpen) setCreatedInviteCode(null)
        onOpenChange(dialogIsOpen)
      }}
    >
      <DialogContent>
        <DialogTitle>Invite teammates</DialogTitle>
        {createdInviteCode === null ? (
          <>
            <DialogDescription>
              Anyone with this code can join “your workspace”. Invites expire in 14 days and allow
              25 uses.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                isLoading={createWorkspaceInvite.isPending}
                onClick={() => void handleCreateInviteClick()}
              >
                Create invite
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogDescription>
              Share this code or link. It stops working after 25 uses or 14 days.
            </DialogDescription>
            <p className="rounded-control bg-sunken px-4 py-3 text-center font-mono text-lg tracking-widest text-primary">
              {formatInviteCodeForDisplay(createdInviteCode)}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => void copyInviteTextToClipboard()}>
                {hasCopiedCode ? <Check aria-hidden /> : <Copy aria-hidden />}
                {hasCopiedCode ? 'Copied' : 'Copy invite'}
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false)
                  setCreatedInviteCode(null)
                }}
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
