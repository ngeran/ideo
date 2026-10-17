// =============================================================================
// FILE:    apps/web/src/features/plans/components/plan-page.tsx
// PURPOSE: One plan: header with status control and summary, the milestone
//          timeline with an add form, and the task board. Promoting an idea
//          lands here; live updates arrive through the workspace room.
// USED BY: app/application-router.tsx (route /plans/$planId)
// =============================================================================

import type { PlanDetailResponse, PlanStatus } from '@ideo/shared'
import { ENTITY_LIMITS, PLAN_STATUS_LABELS, PLAN_STATUS_VALUES } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Map as MapIcon } from 'lucide-react'
import { useState } from 'react'
import { UserAvatar } from '../../../shared/components/ui/avatar'
import { Button } from '../../../shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { Input } from '../../../shared/components/ui/input'
import { Skeleton } from '../../../shared/components/ui/skeleton'
import { useWorkspaceDetail } from '../../workspaces/hooks/use-workspace-detail'
import { usePlanDetail } from '../hooks/use-plan-detail'
import { useAddPlanMilestone, useUpdatePlan } from '../hooks/use-plan-mutations'
import { PlanNotes } from './plan-notes'
import { PlanStatusBadge } from './plan-status-badge'
import { TaskBoard } from './task-board'

// ---- Types ------------------------------------------------------------------

/** The milestone rows the page renders. */
type PlanMilestoneRow = PlanDetailResponse['milestones'][number]

/** The plan page's sections. */
type PlanTabId = 'tasks' | 'notes'

// ---- Constants --------------------------------------------------------------

/** The plan page tabs, in display order. */
const PLAN_TABS: Array<{ tabId: PlanTabId; tabLabel: string }> = [
  { tabId: 'tasks', tabLabel: 'Task board' },
  { tabId: 'notes', tabLabel: 'Notes' },
]

// ---- Section components -----------------------------------------------------

/** The status select; saves on change like the stage control on the drawer. */
function PlanStatusSelect({ planId, planStatus }: { planId: string; planStatus: PlanStatus }) {
  const updatePlan = useUpdatePlan(planId)

  return (
    <span className="flex items-center gap-2">
      <PlanStatusBadge planStatus={planStatus} />
      <select
        value={planStatus}
        onChange={(changeEvent) =>
          updatePlan.mutate({ planStatus: changeEvent.target.value as PlanStatus })
        }
        aria-label="Plan status"
        className="h-9 rounded-control border border-subtle bg-card px-2 text-sm text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        {PLAN_STATUS_VALUES.map((statusValue) => (
          <option key={statusValue} value={statusValue}>
            {PLAN_STATUS_LABELS[statusValue]}
          </option>
        ))}
      </select>
      {updatePlan.isPending ? <span className="font-mono text-xs text-muted">saving…</span> : null}
    </span>
  )
}

/** The milestone timeline plus its add form. */
function MilestoneTimeline({
  planId,
  milestones,
}: {
  planId: string
  milestones: PlanMilestoneRow[]
}) {
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('')
  const addMilestone = useAddPlanMilestone(planId, () => {
    setNewMilestoneTitle('')
    setNewMilestoneDueDate('')
  })

  async function handleMilestoneSubmit() {
    await addMilestone.mutateAsync({
      title: newMilestoneTitle,
      dueDate: newMilestoneDueDate === '' ? null : newMilestoneDueDate,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Milestones <span className="font-mono text-sm text-muted">{milestones.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {milestones.length === 0 ? (
          <p className="text-sm text-muted">No milestones yet — add the first checkpoint.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {milestones.map((milestoneRow) => (
              <li
                key={milestoneRow.id}
                className="flex items-center gap-3 border-b border-subtle pb-2 text-sm last:border-b-0"
              >
                <span aria-hidden className="text-muted">
                  ◆
                </span>
                <span className="font-medium text-primary">{milestoneRow.title}</span>
                {milestoneRow.dueDate !== null ? (
                  <span className="font-mono text-xs text-muted">due {milestoneRow.dueDate}</span>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        <form
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault()
            void handleMilestoneSubmit()
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <Input
            value={newMilestoneTitle}
            onChange={(changeEvent) => setNewMilestoneTitle(changeEvent.target.value)}
            placeholder="Add a milestone…"
            aria-label="New milestone title"
            maxLength={ENTITY_LIMITS.milestoneTitle}
            className="min-w-48 flex-1"
          />
          <Input
            type="date"
            value={newMilestoneDueDate}
            onChange={(changeEvent) => setNewMilestoneDueDate(changeEvent.target.value)}
            aria-label="New milestone due date"
            className="w-40"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            isLoading={addMilestone.isPending}
            disabled={newMilestoneTitle.trim().length === 0}
          >
            Add
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ---- Component --------------------------------------------------------------

/** The plan page at /plans/$planId. */
export function PlanPage() {
  const { planId } = useParams({ from: '/plans/$planId' })
  const planDetailQuery = usePlanDetail(planId)
  const [activeTab, setActiveTab] = useState<PlanTabId>('tasks')

  // Members power the task assignee select; wait for the plan to load first.
  const planWorkspaceId = planDetailQuery.data?.plan.workspaceId ?? null
  const workspaceDetailQuery = useWorkspaceDetail(planWorkspaceId ?? '', {
    isEnabled: planWorkspaceId !== null,
  })

  if (planDetailQuery.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (planDetailQuery.isError || planDetailQuery.data === undefined) {
    return (
      <EmptyState
        icon={MapIcon}
        title="Plan unavailable"
        description="It may have been deleted, or you may not be a member of its workspace."
        action={
          <Button renderAsChild>
            <Link to="/plans">Back to plans</Link>
          </Button>
        }
      />
    )
  }

  const { plan, milestones, tasks } = planDetailQuery.data
  const workspaceMembers = workspaceDetailQuery.data?.members ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Link
          to="/plans"
          className="flex items-center gap-1 text-sm text-muted outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-accent"
        >
          <ArrowLeft className="size-4" aria-hidden /> All plans
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-primary">{plan.title}</h1>
          <PlanStatusSelect planId={plan.id} planStatus={plan.planStatus} />
        </div>
        {plan.summary ? <p className="text-sm text-muted">{plan.summary}</p> : null}
        <p className="flex items-center gap-2 text-xs text-muted">
          <UserAvatar
            displayName={plan.createdBy.displayName}
            avatarColor={plan.createdBy.avatarColor}
            className="size-4"
          />
          Started by {plan.createdBy.displayName}
          {plan.taskTotal > 0 ? ` · ${plan.taskDoneCount}/${plan.taskTotal} tasks done` : ''}
        </p>
      </div>

      <MilestoneTimeline planId={plan.id} milestones={milestones} />

      <div className="flex gap-1 border-b border-subtle" role="tablist" aria-label="Plan sections">
        {PLAN_TABS.map((planTab) => (
          <button
            key={planTab.tabId}
            type="button"
            role="tab"
            aria-selected={activeTab === planTab.tabId}
            onClick={() => setActiveTab(planTab.tabId)}
            className={
              '-mb-px rounded-control border-b-2 px-3 py-2 text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
              (activeTab === planTab.tabId
                ? 'border-accent font-medium text-primary'
                : 'border-transparent text-muted hover:text-primary')
            }
          >
            {planTab.tabLabel}
          </button>
        ))}
      </div>

      {activeTab === 'tasks' ? (
        <TaskBoard
          planId={plan.id}
          tasks={tasks}
          milestones={milestones}
          members={workspaceMembers}
        />
      ) : (
        <PlanNotes planId={plan.id} />
      )}
    </div>
  )
}
