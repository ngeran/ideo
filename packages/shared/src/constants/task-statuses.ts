// =============================================================================
// FILE:    packages/shared/src/constants/task-statuses.ts
// PURPOSE: Task board column values (To do / Doing / Done) shared by API
//          validation and the task board UI.
// USED BY: packages/shared/src/index.ts, task feature code (web + worker)
// =============================================================================

// ---- Constants --------------------------------------------------------------

/**
 * Task statuses, in board order. Mirrored by the tasks.task_status CHECK
 * constraint and by the Zod schema for task updates.
 */
export const TASK_STATUS_VALUES = ['todo', 'doing', 'done'] as const

/** Human-readable label for each task status, keyed by status value. */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  doing: 'Doing',
  done: 'Done',
}

// ---- Types ------------------------------------------------------------------

/** Which board column a task sits in. */
export type TaskStatus = (typeof TASK_STATUS_VALUES)[number]
