// =============================================================================
// FILE:    apps/web/src/features/plans/components/task-edit-dialog.tsx
// PURPOSE: Dialog for editing one task: status, assignee (workspace members
//          only), and milestone. Saves on change via the plan mutations.
// USED BY: task-board.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { PlanDetailResponse, WorkspaceMemberResponse } from '@ideo/shared'
import { TASK_STATUS_LABELS, TASK_STATUS_VALUES } from '@ideo/shared'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../shared/components/ui/dialog'
import { useUpdatePlanTask } from '../hooks/use-plan-mutations'

// ---- Types ------------------------------------------------------------------
type TaskEditDialogProps = {
  task: PlanDetailResponse['tasks'][number] | null
  members: WorkspaceMemberResponse[]
  milestones: PlanDetailResponse['milestones']
  onClose: () => void
  planId: string
}

// ---- Component --------------------------------------------------------------

/** Modal form for one task's status, assignee, and milestone. */
export function TaskEditDialog({
  task,
  members,
  milestones,
  onClose,
  planId,
}: TaskEditDialogProps) {
  const updateTask = useUpdatePlanTask(planId)

  const isOpen = task !== null

  function handleFieldChange(
    updateFields: Parameters<typeof updateTask.mutate>[0]['updateFields'],
  ) {
    if (task === null) return
    updateTask.mutate({ taskId: task.id, updateFields })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(dialogIsOpen) => {
        if (!dialogIsOpen) onClose()
      }}
    >
      {task === null ? null : (
        <DialogContent>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>Changes save immediately.</DialogDescription>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-primary">Status</span>
              <select
                value={task.taskStatus}
                onChange={(changeEvent) =>
                  handleFieldChange({
                    taskStatus: changeEvent.target.value as typeof task.taskStatus,
                  })
                }
                aria-label="Task status"
                className="h-9 rounded-control border border-subtle bg-card px-2 text-sm text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                {TASK_STATUS_VALUES.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {TASK_STATUS_LABELS[statusValue]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-primary">Assignee</span>
              <select
                value={task.assignee?.userId ?? ''}
                onChange={(changeEvent) =>
                  handleFieldChange({ assigneeUserId: changeEvent.target.value || null })
                }
                aria-label="Task assignee"
                className="h-9 rounded-control border border-subtle bg-card px-2 text-sm text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <option value="">Unassigned</option>
                {members.map((workspaceMember) => (
                  <option key={workspaceMember.userId} value={workspaceMember.userId}>
                    {workspaceMember.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-primary">Milestone</span>
              <select
                value={task.milestoneId ?? ''}
                onChange={(changeEvent) =>
                  handleFieldChange({ milestoneId: changeEvent.target.value || null })
                }
                aria-label="Task milestone"
                className="h-9 rounded-control border border-subtle bg-card px-2 text-sm text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <option value="">No milestone</option>
                {milestones.map((planMilestone) => (
                  <option key={planMilestone.id} value={planMilestone.id}>
                    {planMilestone.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
