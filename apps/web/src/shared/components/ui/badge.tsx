// =============================================================================
// FILE:    apps/web/src/shared/components/ui/badge.tsx
// PURPOSE: Small status labels: generic variants plus one colored badge per
//          pipeline stage. Stage colors come from theme tokens and always ride
//          along with a visible text label (never color alone).
// USED BY: idea cards, plan lists, task board, overview page
// =============================================================================

import type { IdeaStage } from '@ideo/shared'
import { IDEA_STAGE_LABELS } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { cva } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Types ------------------------------------------------------------------
export type BadgeVariant = 'default' | 'outline' | 'accent' | 'success' | 'warning' | 'danger'

export type BadgeProps = ComponentProps<'span'> & { variant?: BadgeVariant }

// ---- Styling ----------------------------------------------------------------
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-xs font-medium font-mono',
  {
    variants: {
      variant: {
        default: 'bg-sunken text-muted',
        outline: 'border border-subtle text-muted',
        accent: 'bg-accent/10 text-accent',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-danger/10 text-danger',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

// ---- Components -------------------------------------------------------------

/** Generic status label. */
export function Badge({ className, variant = 'default', ...badgeProps }: BadgeProps) {
  return (
    <span
      className={mergeComponentClasses(badgeVariants({ variant }), className)}
      {...badgeProps}
    />
  )
}

// ---- Types ------------------------------------------------------------------
export type StageBadgeProps = ComponentProps<'span'> & { stage: IdeaStage }

// ---- Styling ----------------------------------------------------------------

/**
 * Stage badge classes, keyed by stage value so the mapping is impossible to
 * get out of sync with the shared stage constants.
 */
const stageBadgeClasses: Record<IdeaStage, string> = {
  spark: 'bg-stage-spark/10 text-stage-spark',
  shaping: 'bg-stage-shaping/10 text-stage-shaping',
  validated: 'bg-stage-validated/10 text-stage-validated',
  planned: 'bg-stage-planned/10 text-stage-planned',
  launched: 'bg-stage-launched/10 text-stage-launched',
}

// ---- Components -------------------------------------------------------------

/** Colored badge for a pipeline stage, always showing the stage's text label. */
export function StageBadge({ stage, className, ...badgeProps }: StageBadgeProps) {
  return (
    <span
      data-stage={stage}
      className={mergeComponentClasses(badgeVariants(), stageBadgeClasses[stage], className)}
      {...badgeProps}
    >
      {IDEA_STAGE_LABELS[stage]}
    </span>
  )
}
