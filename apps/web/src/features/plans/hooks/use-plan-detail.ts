// =============================================================================
// FILE:    apps/web/src/features/plans/hooks/use-plan-detail.ts
// PURPOSE: Loads one plan with its milestones and tasks for the plan page.
//          Realtime task and plan events invalidate this cache entry.
// USED BY: plan-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useQuery } from '@tanstack/react-query'
import { fetchPlanDetail } from '../api/plan-api'

// ---- Constants --------------------------------------------------------------

/** Cache key prefix for plan details. */
export const PLAN_DETAIL_QUERY_KEY_PREFIX = 'plan'

// ---- Hooks ------------------------------------------------------------------

/**
 * Loads a plan with its milestones and tasks.
 * Returns the TanStack Query result; disabled while planId is null.
 */
export function usePlanDetail(planId: string) {
  return useQuery({
    queryKey: [PLAN_DETAIL_QUERY_KEY_PREFIX, planId],
    queryFn: () => fetchPlanDetail(planId),
  })
}
