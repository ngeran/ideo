// =============================================================================
// FILE:    apps/web/src/features/plans/components/task-board.tsx
// PURPOSE: The three-column task board (To do / Doing / Done). Tasks drag
//          between columns and reorder within a column (native HTML5 drag
//          and drop, midpoint sort orders); the To do column hosts the add
//          form; clicking a task opens its edit dialog.
// USED BY: plan-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type {
  PlanMilestoneResponse,
  PlanTaskResponse,
  TaskStatus,
  WorkspaceMemberResponse,
} from '@ideo/shared'
import { TASK_STATUS_LABELS, TASK_STATUS_VALUES } from '@ideo/shared'
import { useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { Input } from '../../../shared/components/ui/input'
import { useAddPlanTask, useUpdatePlanTask } from '../hooks/use-plan-mutations'
import { TaskCard } from './task-card'
import { TaskEditDialog } from './task-edit-dialog'

// ---- Types ------------------------------------------------------------------
type TaskBoardProps = {
  planId: string
  tasks: PlanTaskResponse[]
  milestones: PlanMilestoneResponse[]
  members: WorkspaceMemberResponse[]
}

// ---- Constants --------------------------------------------------------------

/** Default gap between sort orders, big enough for many midpoint inserts. */
const SORT_ORDER_GAP = 1024

// ---- Pure helpers -----------------------------------------------------------

/**
 * Computes the sort order for inserting a task at `insertIndex` of a column
 * whose remaining tasks are `columnTasks` (already sorted, dragged task
 * removed). Midpoints keep reorderings cheap: one PATCH, no renormalizing.
 */
export function computeSortOrder(columnTasks: PlanTaskResponse[], insertIndex: number): number {
  const previousTask = columnTasks[insertIndex - 1]
  const nextTask = columnTasks[insertIndex]

  if (previousTask === undefined && nextTask === undefined) return SORT_ORDER_GAP
  if (nextTask === undefined) {
    return (previousTask?.sortOrder ?? 0) + SORT_ORDER_GAP
  }
  if (previousTask === undefined) return nextTask.sortOrder - SORT_ORDER_GAP
  return Math.floor((previousTask.sortOrder + nextTask.sortOrder) / 2)
}

/** One column's tasks, in board order. */
function tasksForStatus(boardTasks: PlanTaskResponse[], status: TaskStatus): PlanTaskResponse[] {
  return boardTasks
    .filter((boardTask) => boardTask.taskStatus === status)
    .sort((firstTask, secondTask) => firstTask.sortOrder - secondTask.sortOrder)
}

// ---- Component --------------------------------------------------------------

/** The To do / Doing / Done board for one plan. */
export function TaskBoard({ planId, tasks, milestones, members }: TaskBoardProps) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const addTask = useAddPlanTask(planId, () => setNewTaskTitle(''))
  const updateTask = useUpdatePlanTask(planId)

  const openTask = tasks.find((boardTask) => boardTask.id === openTaskId) ?? null

  /**
   * Moves a dragged task into `targetStatus`, optionally before a specific
   * task; a drop that would change nothing is skipped.
   */
  function handleTaskDrop(
    draggedTaskId: string,
    targetStatus: TaskStatus,
    insertBeforeTaskId: string | null,
  ) {
    setDragOverStatus(null)

    const draggedTask = tasks.find((boardTask) => boardTask.id === draggedTaskId)
    if (draggedTask === undefined) return

    const targetColumnTasks = tasksForStatus(tasks, targetStatus).filter(
      (columnTask) => columnTask.id !== draggedTaskId,
    )
    const insertIndex =
      insertBeforeTaskId === null
        ? targetColumnTasks.length
        : Math.max(
            0,
            targetColumnTasks.findIndex((columnTask) => columnTask.id === insertBeforeTaskId),
          )
    const nextSortOrder = computeSortOrder(targetColumnTasks, insertIndex)

    const isNoOpMove =
      draggedTask.taskStatus === targetStatus && draggedTask.sortOrder === nextSortOrder
    if (isNoOpMove) return

    updateTask.mutate({
      taskId: draggedTaskId,
      updateFields: { taskStatus: targetStatus, sortOrder: nextSortOrder },
    })
  }

  async function handleAddTaskSubmit() {
    await addTask.mutateAsync({ title: newTaskTitle, milestoneId: null, assigneeUserId: null })
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {TASK_STATUS_VALUES.map((statusValue) => {
        const columnTasks = tasksForStatus(tasks, statusValue)
        return (
          <fieldset
            key={statusValue}
            onDragOver={(dragEvent) => {
              dragEvent.preventDefault()
              dragEvent.dataTransfer.dropEffect = 'move'
              setDragOverStatus(statusValue)
            }}
            onDragLeave={() =>
              setDragOverStatus((currentStatus) =>
                currentStatus === statusValue ? null : currentStatus,
              )
            }
            onDrop={(dropEvent) => {
              dropEvent.preventDefault()
              handleTaskDrop(dropEvent.dataTransfer.getData('text/plain'), statusValue, null)
            }}
            className={
              'flex flex-col gap-2 rounded-control border p-3 transition-colors duration-150 ' +
              (dragOverStatus === statusValue
                ? 'border-accent/50 bg-accent/5'
                : 'border-subtle bg-card')
            }
          >
            <legend className="sr-only">{TASK_STATUS_LABELS[statusValue]} column</legend>
            <p className="flex items-center justify-between font-mono text-xs text-muted">
              {TASK_STATUS_LABELS[statusValue].toUpperCase()}
              <span>{columnTasks.length}</span>
            </p>

            <ul className="flex flex-col gap-2">
              {columnTasks.map((columnTask) => (
                <li
                  key={columnTask.id}
                  onDragOver={(dragEvent) => {
                    dragEvent.preventDefault()
                    dragEvent.stopPropagation()
                  }}
                  onDrop={(dropEvent) => {
                    dropEvent.preventDefault()
                    dropEvent.stopPropagation()
                    handleTaskDrop(
                      dropEvent.dataTransfer.getData('text/plain'),
                      statusValue,
                      columnTask.id,
                    )
                  }}
                >
                  <TaskCard
                    task={columnTask}
                    milestone={milestones.find((m) => m.id === columnTask.milestoneId) ?? null}
                    onOpenTask={setOpenTaskId}
                  />
                </li>
              ))}
            </ul>

            {statusValue === 'todo' ? (
              <form
                onSubmit={(submitEvent) => {
                  submitEvent.preventDefault()
                  void handleAddTaskSubmit()
                }}
                className="mt-1 flex flex-col gap-2"
              >
                <Input
                  value={newTaskTitle}
                  onChange={(changeEvent) => setNewTaskTitle(changeEvent.target.value)}
                  placeholder="Add a task…"
                  aria-label="New task title"
                  maxLength={120}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  isLoading={addTask.isPending}
                  disabled={newTaskTitle.trim().length === 0}
                >
                  Add task
                </Button>
              </form>
            ) : null}
          </fieldset>
        )
      })}

      <TaskEditDialog
        planId={planId}
        task={openTask}
        members={members}
        milestones={milestones}
        onClose={() => setOpenTaskId(null)}
      />
    </div>
  )
}
