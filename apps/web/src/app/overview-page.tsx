// =============================================================================
// FILE:    apps/web/src/app/overview-page.tsx
// PURPOSE: The '/' landing page: greets the team, shows the idea-to-reality
//          pipeline (the product's spine), and reflects the workspace state —
//          nothing yet, not signed in, or the current workspace.
// USED BY: app/application-router.tsx (overview route)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { IdeaStage } from '@ideo/shared'
import { IDEA_STAGE_VALUES } from '@ideo/shared'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, LogIn, UserRoundPlus, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { CreateWorkspaceDialog } from '../features/workspaces/components/create-workspace-dialog'
import { JoinWorkspaceDialog } from '../features/workspaces/components/join-workspace-dialog'
import { useCurrentUser } from '../features/workspaces/hooks/use-current-user'
import { StageBadge } from '../shared/components/ui/badge'
import { Button } from '../shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../shared/components/ui/card'
import { EmptyState } from '../shared/components/ui/empty-state'
import { Skeleton } from '../shared/components/ui/skeleton'
import { ApiRequestError } from '../shared/lib/api-client'

// ---- Component helpers ------------------------------------------------------

/** One pipeline stage chip with an arrow to the next stage. */
function PipelineStep({ stage, isLastStage }: { stage: IdeaStage; isLastStage: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <StageBadge stage={stage} />
      {!isLastStage ? <ArrowRight className="size-3.5 text-muted" aria-hidden /> : null}
    </li>
  )
}

// ---- Component --------------------------------------------------------------

/** Overview landing page. */
export function OverviewPage() {
  const navigate = useNavigate()
  const currentUserQuery = useCurrentUser()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false)

  function openWorkspace(workspaceId: string) {
    void navigate({ to: '/workspaces/$workspaceId', params: { workspaceId } })
  }

  return (
    <div className="flex flex-col gap-4">
      <WorkspaceStatusCard
        currentUserQuery={currentUserQuery}
        onOpenCreateDialog={() => setIsCreateDialogOpen(true)}
        onOpenJoinDialog={() => setIsJoinDialogOpen(true)}
        onOpenWorkspace={openWorkspace}
      />

      <Card>
        <CardHeader>
          <CardTitle>Welcome to Ideo</CardTitle>
          <CardDescription>
            A private space for your team's ideas — from first spark to launched. The design system,
            themes, and app shell are live; features arrive phase by phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-2 font-mono text-xs text-muted">THE PIPELINE</p>
          <ul className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {IDEA_STAGE_VALUES.map((stage, stageIndex) => (
              <PipelineStep
                key={stage}
                stage={stage}
                isLastStage={stageIndex === IDEA_STAGE_VALUES.length - 1}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Try it now</CardTitle>
          <CardDescription>
            Press{' '}
            <kbd className="rounded-control bg-sunken px-1.5 py-0.5 font-mono text-xs">
              Ctrl/⌘ + K
            </kbd>{' '}
            for the command palette, or toggle Light / Dark / System from the sidebar (top bar on
            mobile). Your choice is remembered per device, with no flash on reload.
          </CardDescription>
        </CardHeader>
      </Card>

      <CreateWorkspaceDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onWorkspaceCreated={openWorkspace}
      />
      <JoinWorkspaceDialog
        isOpen={isJoinDialogOpen}
        onOpenChange={setIsJoinDialogOpen}
        onWorkspaceJoined={openWorkspace}
      />
    </div>
  )
}

// ---- Workspace status ---------------------------------------------------------

/** Props for the workspace status card's data. */
type WorkspaceStatusCardProps = {
  currentUserQuery: ReturnType<typeof useCurrentUser>
  onOpenCreateDialog: () => void
  onOpenJoinDialog: () => void
  onOpenWorkspace: (workspaceId: string) => void
}

/** Shows the right workspace message for the user's current state. */
function WorkspaceStatusCard({
  currentUserQuery,
  onOpenCreateDialog,
  onOpenJoinDialog,
  onOpenWorkspace,
}: WorkspaceStatusCardProps) {
  const { data: meData, isPending, error } = currentUserQuery

  if (isPending) {
    return <Skeleton className="h-28 w-full" />
  }

  const isNotSignedIn = error instanceof ApiRequestError && error.statusCode === 401
  if (isNotSignedIn) {
    return (
      <EmptyState
        icon={LogIn}
        title="Not signed in"
        description="Locally: copy .dev.vars.example to .dev.vars and set DEVELOPMENT_USER_EMAIL — no other setup needed in development."
      />
    )
  }

  const workspaces = meData?.workspaces ?? []
  if (workspaces.length === 0) {
    return (
      <EmptyState
        icon={UsersRound}
        title="No workspace yet"
        description="Create a private space for your team, or join one with an invite code."
        action={
          <div className="flex gap-2">
            <Button onClick={onOpenCreateDialog}>Create workspace</Button>
            <Button variant="secondary" onClick={onOpenJoinDialog}>
              <UserRoundPlus aria-hidden /> Join with code
            </Button>
          </div>
        }
      />
    )
  }

  const firstWorkspace = workspaces[0]
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {firstWorkspace?.name}{' '}
          <span className="font-mono text-xs text-muted">
            {firstWorkspace?.currentUserRole === 'owner' ? '· you own this' : '· member'}
          </span>
        </CardTitle>
        <CardDescription>Your workspace is ready. The idea board lands in Phase 4.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button size="sm" onClick={() => firstWorkspace && onOpenWorkspace(firstWorkspace.id)}>
          Open workspace
        </Button>
        {workspaces.length > 1 ? (
          <span className="self-center text-sm text-muted">
            and {workspaces.length - 1} more in the switcher
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}
