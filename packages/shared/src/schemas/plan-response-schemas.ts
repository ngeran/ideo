// =============================================================================
// FILE:    packages/shared/src/schemas/plan-response-schemas.ts
// PURPOSE: Zod schemas describing every plan-related response body: list,
//          detail (plan + milestones + tasks), and the task board's rows.
// USED BY: packages/shared/src/index.ts, worker plan routes, web plan api
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { PLAN_STATUS_VALUES } from '../constants/plan-statuses'
import { TASK_STATUS_VALUES } from '../constants/task-statuses'

// ---- Validation schemas -----------------------------------------------------

/**
 * The person fields on a plan (its creator) or a task (its assignee).
 * Assignees and creators are always shown; plans have no anonymity rule.
 */
const planPersonSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarColor: z.string(),
})

/** One plan as it appears in the workspace's plan list. */
export const planResponseSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  /** The idea this plan grew from, when it exists anymore. */
  sourceIdeaId: z.string().nullable(),
  title: z.string(),
  summary: z.string(),
  planStatus: z.enum(PLAN_STATUS_VALUES),
  createdBy: planPersonSchema,
  taskTotal: z.number().int(),
  taskDoneCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Page of plans plus the cursor for the next page (null when done). */
export const planListResponseSchema = z.object({
  plans: z.array(planResponseSchema),
  nextCursor: z.string().nullable(),
})

/** One milestone on a plan's timeline. */
export const planMilestoneResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  dueDate: z.string().nullable(),
  isDone: z.boolean(),
  sortOrder: z.number().int(),
})

/** One task on a plan's board. */
export const planTaskResponseSchema = z.object({
  id: z.string(),
  planId: z.string(),
  milestoneId: z.string().nullable(),
  title: z.string(),
  taskStatus: z.enum(TASK_STATUS_VALUES),
  assignee: planPersonSchema.nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** GET /api/plans/:planId — the plan plus its milestones and tasks. */
export const planDetailResponseSchema = z.object({
  plan: planResponseSchema,
  milestones: z.array(planMilestoneResponseSchema),
  tasks: z.array(planTaskResponseSchema),
})

// ---- Types ------------------------------------------------------------------
export type PlanPersonResponse = z.infer<typeof planPersonSchema>
export type PlanResponse = z.infer<typeof planResponseSchema>
export type PlanListResponse = z.infer<typeof planListResponseSchema>
export type PlanMilestoneResponse = z.infer<typeof planMilestoneResponseSchema>
export type PlanTaskResponse = z.infer<typeof planTaskResponseSchema>
export type PlanDetailResponse = z.infer<typeof planDetailResponseSchema>
