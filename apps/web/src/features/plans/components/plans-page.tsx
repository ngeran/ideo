// =============================================================================
// FILE:    apps/web/src/features/plans/components/plans-page.tsx
// PURPOSE: The workspace's plan list: one card per plan with status, task
//          progress, and its creator. Promoting an idea on the board lands
//          the plan here. Live plan events refresh it via the room.
// USED BY: app/application-router.tsx (route /plans)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Link } from '@tanstack/react-router'
import { Map as MapIcon, Plus } from 'lucide-react'
import { UserAvatar } from '../../../shared/components/ui/avatar'
import { Button } from '../../../shared/components/ui/button'
import { Card } from '../../../shared/components/ui/card'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { Skeleton } from '../../../shared/components/ui/skeleton'
import { useSelectedWorkspace } from '../../workspaces/hooks/use-selected-workspace'
import { usePlanList } from '../hooks/use-plan-list'
import { PlanStatusBadge } from './plan-status-badge'

// ---- Types ------------------------------------------------------------------

/** One plan as the list renders it. */
type PlanListRow = NonNullable<
  ReturnType<typeof usePlanList>['data']
>['pages'][number]['plans'][number]

// ---- Section components -----------------------------------------------------

/** The skeleton grid shown while the first plan page loads. */
function PlansSkeleton() {
  const skeletonSlotIds = ['slot-a', 'slot-b', 'slot-c']
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {skeletonSlotIds.map((skeletonSlotId) => (
        <Skeleton key={skeletonSlotId} className="h-36 w-full" />
      ))}
    </div>
  )
}

/** One plan card; the whole body links to the plan page. */
function PlanListCard({ planRow }: { planRow: PlanListRow }) {
  const progressPercent =
    planRow.taskTotal === 0 ? 0 : Math.round((planRow.taskDoneCount / planRow.taskTotal) * 100)

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <PlanStatusBadge planStatus={planRow.planStatus} />
        <span className="font-mono text-xs text-muted">
          {planRow.taskDoneCount}/{planRow.taskTotal} tasks
        </span>
      </div>

      <Link
        to="/plans/$planId"
        params={{ planId: planRow.id }}
        className="rounded-control font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
      >
        {planRow.title}
      </Link>
      {planRow.summary ? (
        <p className="line-clamp-2 text-sm text-muted">{planRow.summary}</p>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 border-t border-subtle pt-2">
        <div className="h-1.5 overflow-hidden rounded-control bg-sunken" aria-hidden>
          <div
            className="h-full rounded-control bg-accent"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="flex items-center gap-2 text-xs text-muted">
          <UserAvatar
            displayName={planRow.createdBy.displayName}
            avatarColor={planRow.createdBy.avatarColor}
            className="size-4"
          />
          Started by {planRow.createdBy.displayName}
        </p>
      </div>
    </Card>
  )
}

// ---- Component --------------------------------------------------------------

/** The plans page at /plans. */
export function PlansPage() {
  const { selectedWorkspaceId, workspaces } = useSelectedWorkspace()
  const planListQuery = usePlanList(selectedWorkspaceId)
  const workspacePlans = planListQuery.data?.pages.flatMap((page) => page.plans) ?? []

  const hasNoWorkspaceAtAll = selectedWorkspaceId === null && workspaces.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-primary">Plans</h1>
        <Button renderAsChild size="sm">
          <Link to="/board">
            <Plus aria-hidden /> Promote an idea
          </Link>
        </Button>
      </div>

      {hasNoWorkspaceAtAll ? (
        <EmptyState
          icon={MapIcon}
          title="No workspace yet"
          description="Create or join a workspace first — plans live inside one."
          action={
            <Button renderAsChild>
              <Link to="/">Back to overview</Link>
            </Button>
          }
        />
      ) : planListQuery.isPending ? (
        <PlansSkeleton />
      ) : planListQuery.isError ? (
        <EmptyState
          icon={MapIcon}
          title="Plans could not load"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={() => void planListQuery.refetch()}>
              Try again
            </Button>
          }
        />
      ) : workspacePlans.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title="No plans yet"
          description="Promote a spark from the idea board — one button turns it into a plan."
          action={
            <Button renderAsChild>
              <Link to="/board">Open the board</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspacePlans.map((planRow) => (
              <PlanListCard key={planRow.id} planRow={planRow} />
            ))}
          </div>

          {planListQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => void planListQuery.fetchNextPage()}
                isLoading={planListQuery.isFetchingNextPage}
              >
                Load more plans
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
