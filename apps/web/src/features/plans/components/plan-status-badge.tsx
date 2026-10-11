// =============================================================================
// FILE:    apps/web/src/features/plans/components/plan-status-badge.tsx
// PURPOSE: Colored badge for a plan's lifecycle status, always paired with
//          its text label (never color alone).
// USED BY: plans-page.tsx, plan-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { PlanStatus } from '@ideo/shared'
import { PLAN_STATUS_LABELS } from '@ideo/shared'
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../../shared/lib/merge-component-classes'

// ---- Types ------------------------------------------------------------------
export type PlanStatusBadgeProps = ComponentProps<'span'> & { planStatus: PlanStatus }

// ---- Styling ----------------------------------------------------------------

/** Badge classes keyed by status so the mapping cannot drift from constants. */
const planStatusBadgeClasses: Record<PlanStatus, string> = {
  draft: 'bg-sunken text-muted',
  active: 'bg-accent/10 text-accent',
  done: 'bg-success/10 text-success',
}

// ---- Component --------------------------------------------------------------

/** Colored label for a plan status. */
export function PlanStatusBadge({ planStatus, className, ...badgeProps }: PlanStatusBadgeProps) {
  return (
    <span
      data-plan-status={planStatus}
      className={mergeComponentClasses(
        'inline-flex items-center rounded-control px-2 py-0.5 font-mono text-xs font-medium',
        planStatusBadgeClasses[planStatus],
        className,
      )}
      {...badgeProps}
    >
      {PLAN_STATUS_LABELS[planStatus]}
    </span>
  )
}
