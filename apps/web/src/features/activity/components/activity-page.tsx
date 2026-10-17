// =============================================================================
// FILE:    apps/web/src/features/activity/components/activity-page.tsx
// PURPOSE: The activity feed: who did what, newest first, updating live as
//          workspace events arrive through the room.
// USED BY: app/application-router.tsx (route /activity)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Link } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
import { UserAvatar } from '../../../shared/components/ui/avatar'
import { Button } from '../../../shared/components/ui/button'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { Skeleton } from '../../../shared/components/ui/skeleton'
import { useSelectedWorkspace } from '../../workspaces/hooks/use-selected-workspace'
import { useActivityList } from '../hooks/use-activity-list'

// ---- Internal helpers -------------------------------------------------------

/** Renders an event's time in the reader's locale. */
function formatEventTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// ---- Component --------------------------------------------------------------

/** The activity feed page at /activity. */
export function ActivityPage() {
  const { selectedWorkspaceId, workspaces } = useSelectedWorkspace()
  const activityListQuery = useActivityList(selectedWorkspaceId)
  const feedEvents = activityListQuery.data?.pages.flatMap((page) => page.events) ?? []

  const hasNoWorkspaceAtAll = selectedWorkspaceId === null && workspaces.length === 0

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-primary">Activity</h1>

      {hasNoWorkspaceAtAll ? (
        <EmptyState
          icon={Activity}
          title="No workspace yet"
          description="Create or join a workspace first — the feed follows one workspace."
          action={
            <Button renderAsChild>
              <Link to="/">Back to overview</Link>
            </Button>
          }
        />
      ) : activityListQuery.isPending ? (
        <div className="flex flex-col gap-2" aria-hidden>
          {['row-a', 'row-b', 'row-c', 'row-d'].map((skeletonRowId) => (
            <Skeleton key={skeletonRowId} className="h-12 w-full" />
          ))}
        </div>
      ) : activityListQuery.isError ? (
        <EmptyState
          icon={Activity}
          title="The feed could not load"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={() => void activityListQuery.refetch()}>
              Try again
            </Button>
          }
        />
      ) : feedEvents.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Nothing has happened yet"
          description="Add an idea, vote, or comment — everything the team does shows up here."
          action={
            <Button renderAsChild>
              <Link to="/board">Open the board</Link>
            </Button>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {feedEvents.map((feedEvent) => (
              <li
                key={feedEvent.id}
                className="flex items-center gap-3 rounded-control border border-subtle bg-card px-3 py-2"
              >
                <UserAvatar
                  displayName={feedEvent.actor.displayName}
                  avatarColor={feedEvent.actor.avatarColor}
                  className="size-7"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm text-primary">{feedEvent.summaryText}</span>
                  <span className="font-mono text-xs text-muted">
                    {formatEventTime(feedEvent.createdAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {activityListQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => void activityListQuery.fetchNextPage()}
                isLoading={activityListQuery.isFetchingNextPage}
              >
                Load older activity
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
