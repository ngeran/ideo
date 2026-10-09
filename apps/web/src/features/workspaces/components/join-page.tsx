// =============================================================================
// FILE:    apps/web/src/features/workspaces/components/join-page.tsx
// PURPOSE: The landing page for invite links (/join?code=XXXX). Pre-fills the
//          code, explains what joining means, and hands off to the join flow.
// USED BY: app/application-router.tsx (route /join)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { UserRoundPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/card'
import { saveSelectedWorkspaceId } from '../selected-workspace-storage'
import { JoinWorkspaceDialog } from './join-workspace-dialog'

// ---- Types ------------------------------------------------------------------

/** Search params the invite link carries. */
type JoinPageSearch = { code?: string }

// ---- Component --------------------------------------------------------------

/** Invite-link landing page. */
export function JoinPage() {
  const navigate = useNavigate()
  const { code: inviteCodeFromLink } = useSearch({ from: '/join' }) as JoinPageSearch
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(true)

  function handleWorkspaceJoined(workspaceId: string) {
    saveSelectedWorkspaceId(workspaceId)
    void navigate({ to: '/workspaces/$workspaceId', params: { workspaceId } })
  }

  return (
    <Card className="mx-auto mt-8 max-w-md">
      <CardHeader>
        <CardTitle>You have been invited</CardTitle>
        <CardDescription>
          Accept the invite to join your team's workspace — boards, plans, and sessions included.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {inviteCodeFromLink ? (
          <p className="rounded-control bg-sunken px-4 py-3 text-center font-mono text-lg tracking-widest text-primary">
            {inviteCodeFromLink}
          </p>
        ) : (
          <p className="text-sm text-muted">
            No code was included in the link — paste it in the dialog.
          </p>
        )}
        <Button onClick={() => setIsJoinDialogOpen(true)} disabled={isJoinDialogOpen}>
          <UserRoundPlus aria-hidden /> Enter code
        </Button>
        <Button variant="ghost" renderAsChild>
          <Link to="/">Not now</Link>
        </Button>
      </CardContent>

      <JoinWorkspaceDialog
        isOpen={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
        onWorkspaceJoined={handleWorkspaceJoined}
        initialInviteCode={inviteCodeFromLink ?? ''}
      />
    </Card>
  )
}
