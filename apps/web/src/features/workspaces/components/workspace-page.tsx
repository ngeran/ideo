// =============================================================================
// FILE:    apps/web/src/features/workspaces/components/workspace-page.tsx
// PURPOSE: One workspace's home: header with name and role, the member list,
//          the invite button, and a pointer to the (upcoming) idea board.
// USED BY: app/application-router.tsx (route /workspaces/$workspaceId)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Link, useParams } from '@tanstack/react-router'
import { Lightbulb, UserRoundPlus } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../../../shared/components/ui/badge'
import { Button } from '../../../shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/card'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { Skeleton } from '../../../shared/components/ui/skeleton'
import { useWorkspaceDetail } from '../hooks/use-workspace-detail'
import { InviteDialog } from './invite-dialog'
import { WorkspaceMemberList } from './workspace-member-list'

// ---- Component --------------------------------------------------------------

/** The workspace page, driven by the route parameter. */
export function WorkspacePage() {
  const { workspaceId } = useParams({ from: '/workspaces/$workspaceId' })
  const workspaceDetailQuery = useWorkspaceDetail(workspaceId)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)

  if (workspaceDetailQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (workspaceDetailQuery.isError || workspaceDetailQuery.data === undefined) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Workspace unavailable"
        description="You may not be a member, or it may have been deleted."
        action={
          <Button renderAsChild>
            <Link to="/">Back to overview</Link>
          </Button>
        }
      />
    )
  }

  const { workspace, members } = workspaceDetailQuery.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-primary">{workspace.name}</h1>
          <Badge variant={workspace.currentUserRole === 'owner' ? 'accent' : 'outline'}>
            {workspace.currentUserRole === 'owner' ? 'You own this' : 'Member'}
          </Badge>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setIsInviteDialogOpen(true)}>
          <UserRoundPlus aria-hidden /> Invite teammates
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Members <span className="font-mono text-sm text-muted">{members.length}</span>
          </CardTitle>
          <CardDescription>
            Everyone here can see and edit everything in this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkspaceMemberList members={members} />
        </CardContent>
      </Card>

      <EmptyState
        icon={Lightbulb}
        title="The idea board arrives in Phase 4"
        description="Cards with tags, stages, voting, and live comments will live here."
      />

      <InviteDialog
        isOpen={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        workspaceId={workspace.id}
      />
    </div>
  )
}
