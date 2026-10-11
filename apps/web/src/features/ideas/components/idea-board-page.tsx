// =============================================================================
// FILE:    apps/web/src/features/ideas/components/idea-board-page.tsx
// PURPOSE: The idea board: stage filter chips, sort control, a responsive
//          card grid with skeleton loaders, "load more" paging, the create
//          dialog, and the detail drawer. Board state stays in URL-free
//          component state; the cache key carries it.
// USED BY: app/application-router.tsx (route /board)
// =============================================================================

import type { IdeaStage, WorkspaceViewer } from '@ideo/shared'
import { IDEA_STAGE_LABELS, IDEA_STAGE_VALUES } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { Link } from '@tanstack/react-router'
import { Lightbulb, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { Skeleton } from '../../../shared/components/ui/skeleton'
import { useCurrentUser } from '../../workspaces/hooks/use-current-user'
import { useSelectedWorkspace } from '../../workspaces/hooks/use-selected-workspace'
import { useWorkspaceRoom } from '../../workspaces/hooks/use-workspace-room'
import type { IdeaListFilters } from '../hooks/use-idea-list'
import { useIdeaList } from '../hooks/use-idea-list'
import { CreateIdeaDialog } from './create-idea-dialog'
import { IdeaCard } from './idea-card'
import { IdeaDetailDrawer } from './idea-detail-drawer'

// ---- Types ------------------------------------------------------------------

/** One stage filter chip: a stage value, or 'all' for the whole board. */
type StageChip = {
  chipValue: IdeaStage | 'all'
  chipLabel: string
}

// ---- Constants --------------------------------------------------------------

/** The filter chips, in pipeline order, with "all" first. */
const STAGE_CHIPS: StageChip[] = [
  { chipValue: 'all', chipLabel: 'All' },
  ...IDEA_STAGE_VALUES.map((stageValue) => ({
    chipValue: stageValue,
    chipLabel: IDEA_STAGE_LABELS[stageValue],
  })),
]

/** The sort options, in the order the API advertises them. */
const SORT_OPTIONS: Array<{ sortValue: IdeaListFilters['sort']; sortLabel: string }> = [
  { sortValue: 'newest', sortLabel: 'Newest' },
  { sortValue: 'most_voted', sortLabel: 'Most voted' },
  { sortValue: 'best_ice', sortLabel: 'Best ICE' },
]

// ---- Section components -----------------------------------------------------

/** One stage filter chip; the active one is filled, the rest are quiet. */
function StageFilterChip({
  chip,
  isActive,
  onSelect,
}: {
  chip: StageChip
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={
        'rounded-control border px-3 py-1.5 text-sm transition-colors duration-150 outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-accent ' +
        (isActive
          ? 'border-accent/40 bg-accent/10 font-medium text-accent'
          : 'border-subtle text-muted hover:bg-sunken hover:text-primary')
      }
    >
      {chip.chipLabel}
    </button>
  )
}

/** Stable keys for the skeleton placeholders (indexes would trip the linter). */
const SKELETON_SLOT_IDS = ['slot-a', 'slot-b', 'slot-c', 'slot-d', 'slot-e', 'slot-f']

/** The skeleton grid shown while the first board page loads. */
function IdeaBoardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {SKELETON_SLOT_IDS.map((skeletonSlotId) => (
        <Skeleton key={skeletonSlotId} className="h-40 w-full" />
      ))}
    </div>
  )
}

// ---- Component --------------------------------------------------------------

/** The idea board page at /board. */
export function IdeaBoardPage() {
  const { selectedWorkspaceId, workspaces } = useSelectedWorkspace()
  const [filters, setFilters] = useState<IdeaListFilters>({ stage: 'all', sort: 'newest' })
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [openIdeaId, setOpenIdeaId] = useState<string | null>(null)

  const ideaListQuery = useIdeaList(selectedWorkspaceId, filters)
  const boardIdeas = ideaListQuery.data?.pages.flatMap((page) => page.ideas) ?? []

  // Live updates + presence for the selected workspace's room.
  const { viewers, isConnected, sendViewing } = useWorkspaceRoom(selectedWorkspaceId)
  const currentUserId = useCurrentUser().data?.user.id

  // Report which idea this tab is looking at; the room learns when the
  // drawer opens or closes.
  useEffect(() => {
    sendViewing(openIdeaId)
    return () => sendViewing(null)
  }, [openIdeaId, sendViewing])

  /** Presence for one idea: teammates viewing it, current user excluded. */
  function viewersOfIdea(ideaId: string): WorkspaceViewer[] {
    return viewers.filter(
      (roomViewer) => roomViewer.viewingIdeaId === ideaId && roomViewer.userId !== currentUserId,
    )
  }

  const openIdeaViewers = openIdeaId !== null ? viewersOfIdea(openIdeaId) : []

  /** A fresh idea lands in Spark, so show the whole board to reveal it. */
  function handleIdeaCreated(_createdIdeaId: string) {
    setFilters((previousFilters) => ({ ...previousFilters, stage: 'all' }))
  }

  const hasNoWorkspaceAtAll = selectedWorkspaceId === null && workspaces.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-primary">
          Idea board
          <span
            className="flex items-center gap-1.5 font-mono text-xs font-normal text-muted"
            title={isConnected ? 'Live updates are on.' : 'Reconnecting…'}
          >
            <span
              aria-hidden
              className={
                isConnected
                  ? 'size-1.5 rounded-full bg-success'
                  : 'size-1.5 animate-pulse rounded-full bg-warning'
              }
            />
            {isConnected ? 'Live' : 'Connecting…'}
          </span>
        </h1>
        <Button
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={selectedWorkspaceId === null}
        >
          <Plus aria-hidden /> Add idea
        </Button>
      </div>

      {hasNoWorkspaceAtAll ? (
        <EmptyState
          icon={Lightbulb}
          title="No workspace yet"
          description="Create or join a workspace first — the board lives inside one."
          action={
            <Button renderAsChild>
              <Link to="/">Back to overview</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <fieldset className="flex flex-wrap items-center gap-1.5">
              <legend className="sr-only">Filter by stage</legend>
              {STAGE_CHIPS.map((stageChip) => (
                <StageFilterChip
                  key={stageChip.chipValue}
                  chip={stageChip}
                  isActive={filters.stage === stageChip.chipValue}
                  onSelect={() => setFilters({ ...filters, stage: stageChip.chipValue })}
                />
              ))}
            </fieldset>

            <label className="flex items-center gap-2 text-sm text-muted">
              Sort
              <select
                value={filters.sort}
                onChange={(changeEvent) =>
                  setFilters((previousFilters) => ({
                    ...previousFilters,
                    sort: changeEvent.target.value as IdeaListFilters['sort'],
                  }))
                }
                aria-label="Sort ideas"
                className="h-9 rounded-control border border-subtle bg-card px-2 text-sm text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                {SORT_OPTIONS.map((sortOption) => (
                  <option key={sortOption.sortValue} value={sortOption.sortValue}>
                    {sortOption.sortLabel}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {ideaListQuery.isPending ? (
            <IdeaBoardSkeleton />
          ) : ideaListQuery.isError ? (
            <EmptyState
              icon={Lightbulb}
              title="The board could not load"
              description="Check your connection and try again."
              action={
                <Button variant="secondary" onClick={() => void ideaListQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : boardIdeas.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="No ideas here yet"
              description={
                filters.stage === 'all'
                  ? 'Add the first spark — a title is enough to start.'
                  : `Nothing is in the ${IDEA_STAGE_LABELS[filters.stage]} stage. Try another filter or add an idea.`
              }
              action={
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus aria-hidden /> Add idea
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {boardIdeas.map((boardIdea) => (
                  <IdeaCard
                    key={boardIdea.id}
                    idea={boardIdea}
                    currentViewers={viewersOfIdea(boardIdea.id)}
                    onOpenIdea={setOpenIdeaId}
                  />
                ))}
              </div>

              {ideaListQuery.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => void ideaListQuery.fetchNextPage()}
                    isLoading={ideaListQuery.isFetchingNextPage}
                  >
                    Load more ideas
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}

      {selectedWorkspaceId !== null ? (
        <CreateIdeaDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          workspaceId={selectedWorkspaceId}
          onIdeaCreated={handleIdeaCreated}
        />
      ) : null}

      <IdeaDetailDrawer
        ideaId={openIdeaId}
        isOpen={openIdeaId !== null}
        currentViewers={openIdeaViewers}
        onOpenChange={(drawerIsOpen) => {
          if (!drawerIsOpen) setOpenIdeaId(null)
        }}
      />
    </div>
  )
}
