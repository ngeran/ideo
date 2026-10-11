// =============================================================================
// FILE:    apps/web/src/features/plans/components/task-card.tsx
// PURPOSE: One task on the board: title, assignee avatar, milestone chip.
//          Draggable between columns; clicking opens the edit dialog.
// USED BY: task-board.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { PlanMilestoneResponse, PlanTaskResponse } from '@ideo/shared'
import { UserAvatar } from '../../../shared/components/ui/avatar'
import { Card } from '../../../shared/components/ui/card'

// ---- Types ------------------------------------------------------------------
type TaskCardProps = {
  task: PlanTaskResponse
  /** The task's milestone, when it has one (for the chip). */
  milestone: PlanMilestoneResponse | null
  onOpenTask: (taskId: string) => void
}

// ---- Component --------------------------------------------------------------

/**
 * One board card. Draggable; the whole visible row opens the edit dialog.
 * Drag data uses a plain type so the drop targets can read the task id.
 */
export function TaskCard({ task, milestone, onOpenTask }: TaskCardProps) {
  return (
    <Card
      draggable
      onDragStart={(dragEvent) => {
        dragEvent.dataTransfer.setData('text/plain', task.id)
        dragEvent.dataTransfer.effectAllowed = 'move'
      }}
      className="cursor-grab p-3 active:cursor-grabbing"
    >
      <button
        type="button"
        onClick={() => onOpenTask(task.id)}
        className="flex w-full flex-col items-start gap-2 rounded-control text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Open task: ${task.title}`}
      >
        <span className="text-sm font-medium text-primary">{task.title}</span>
        <span className="flex w-full items-center justify-between gap-2">
          {milestone !== null ? (
            <span className="truncate font-mono text-xs text-muted" title={milestone.title}>
              ◆ {milestone.title}
            </span>
          ) : (
            <span />
          )}
          {task.assignee !== null ? (
            <span title={`Assigned to ${task.assignee.displayName}`}>
              <UserAvatar
                displayName={task.assignee.displayName}
                avatarColor={task.assignee.avatarColor}
                className="size-5"
              />
            </span>
          ) : null}
        </span>
      </button>
    </Card>
  )
}
