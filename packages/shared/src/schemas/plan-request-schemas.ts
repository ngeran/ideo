// =============================================================================
// FILE:    packages/shared/src/schemas/plan-request-schemas.ts
// PURPOSE: Zod schemas for every plan- and task-related request: promote an
//          idea, list plans, update a plan, add a milestone, add a task, and
//          move a task around the board. Used by the Worker routes and the
//          web forms.
// USED BY: packages/shared/src/index.ts, worker plan routes, web plan forms
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { ENTITY_LIMITS } from '../constants/entity-limits'
import { PLAN_STATUS_VALUES } from '../constants/plan-statuses'
import { TASK_STATUS_VALUES } from '../constants/task-statuses'
import { cursorPaginationQuerySchema } from './common-request-schemas'

// ---- Validation schemas -----------------------------------------------------

/** Body of POST /api/ideas/:ideaId/promote-to-plan — empty on purpose. */
export const promoteIdeaToPlanRequestSchema = z.object({})

/** Query string of GET /api/workspaces/:workspaceId/plans. */
export const planListQuerySchema = cursorPaginationQuerySchema

/** Body of PATCH /api/plans/:planId — everything is optional. */
export const updatePlanRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Give the plan a title.')
      .max(ENTITY_LIMITS.planTitle, `Titles are at most ${ENTITY_LIMITS.planTitle} characters.`)
      .optional(),
    summary: z.string().trim().max(ENTITY_LIMITS.planSummary).optional(),
    planStatus: z.enum(PLAN_STATUS_VALUES).optional(),
  })
  .refine((updateFields) => Object.keys(updateFields).length > 0, {
    message: 'Send at least one field to update.',
  })

/** Body of POST /api/plans/:planId/milestones. */
export const createPlanMilestoneRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the milestone a title.')
    .max(
      ENTITY_LIMITS.milestoneTitle,
      `Titles are at most ${ENTITY_LIMITS.milestoneTitle} characters.`,
    ),
  /** An ISO date string (yyyy-mm-dd), or null for "someday". */
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due dates look like 2026-01-31.')
    .nullable()
    .default(null),
})

/** Body of POST /api/plans/:planId/tasks. */
export const createPlanTaskRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the task a title.')
    .max(ENTITY_LIMITS.taskTitle, `Titles are at most ${ENTITY_LIMITS.taskTitle} characters.`),
  milestoneId: z.string().nullable().default(null),
  assigneeUserId: z.string().nullable().default(null),
})

/**
 * Body of PATCH /api/tasks/:taskId — status moves, reassignment, reordering,
 * retitling, and re-bucketing to a milestone. sortOrder spacing is the
 * client's business; the server just stores it.
 */
export const updateTaskRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Give the task a title.')
      .max(ENTITY_LIMITS.taskTitle, `Titles are at most ${ENTITY_LIMITS.taskTitle} characters.`)
      .optional(),
    taskStatus: z.enum(TASK_STATUS_VALUES).optional(),
    assigneeUserId: z.string().nullable().optional(),
    milestoneId: z.string().nullable().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((updateFields) => Object.keys(updateFields).length > 0, {
    message: 'Send at least one field to update.',
  })

// ---- Types ------------------------------------------------------------------
export type PromoteIdeaToPlanRequest = z.infer<typeof promoteIdeaToPlanRequestSchema>
export type PlanListQuery = z.infer<typeof planListQuerySchema>
export type UpdatePlanRequest = z.infer<typeof updatePlanRequestSchema>
export type CreatePlanMilestoneRequest = z.infer<typeof createPlanMilestoneRequestSchema>
export type CreatePlanTaskRequest = z.infer<typeof createPlanTaskRequestSchema>
export type UpdateTaskRequest = z.infer<typeof updateTaskRequestSchema>
