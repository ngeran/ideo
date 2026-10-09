// =============================================================================
// FILE:    packages/shared/src/constants/plan-statuses.ts
// PURPOSE: Plan lifecycle values (draft / active / done) shared by API
//          validation and the plans UI.
// USED BY: packages/shared/src/index.ts, plan feature code (web + worker)
// =============================================================================

// ---- Constants --------------------------------------------------------------

/**
 * Plan statuses. Mirrored by the plans.plan_status CHECK constraint and by
 * the Zod schema for plan updates.
 */
export const PLAN_STATUS_VALUES = ['draft', 'active', 'done'] as const

/** Human-readable label for each plan status, keyed by status value. */
export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  done: 'Done',
}

// ---- Types ------------------------------------------------------------------

/** Where a plan is in its lifecycle. */
export type PlanStatus = (typeof PLAN_STATUS_VALUES)[number]
