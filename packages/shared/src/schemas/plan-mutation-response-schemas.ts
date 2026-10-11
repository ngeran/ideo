// =============================================================================
// FILE:    packages/shared/src/schemas/plan-mutation-response-schemas.ts
// PURPOSE: Small response bodies for plan mutations (promote, update,
//          milestone, task). Kept with the other plan schemas so the client
//          and server agree on every shape.
// USED BY: packages/shared/src/index.ts, worker plan routes, web plan api
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { z } from 'zod'
import { PLAN_STATUS_VALUES } from '../constants/plan-statuses'

// ---- Validation schemas -----------------------------------------------------

/** Body of POST /api/ideas/:ideaId/promote-to-plan. */
export const planCreatedResponseSchema = z.object({
  plan: z.object({ planId: z.string(), title: z.string(), planStatus: z.enum(PLAN_STATUS_VALUES) }),
})

/** Body of PATCH /api/plans/:planId. */
export const planUpdatedResponseSchema = z.object({ ok: z.boolean() })

/** Body of POST /api/plans/:planId/milestones. */
export const milestoneCreatedResponseSchema = z.object({
  milestone: z.object({ milestoneId: z.string() }),
})

/** Body of POST /api/plans/:planId/tasks. */
export const taskCreatedResponseSchema = z.object({
  task: z.object({ taskId: z.string() }),
})

// ---- Types ------------------------------------------------------------------
export type PlanCreatedResponse = z.infer<typeof planCreatedResponseSchema>
export type MilestoneCreatedResponse = z.infer<typeof milestoneCreatedResponseSchema>
export type TaskCreatedResponse = z.infer<typeof taskCreatedResponseSchema>
