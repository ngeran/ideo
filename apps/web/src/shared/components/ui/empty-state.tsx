// =============================================================================
// FILE:    apps/web/src/shared/components/ui/empty-state.tsx
// PURPOSE: The one friendly "nothing here yet" component: an icon (no
//          illustrations), a clear title, one line of guidance, and a single
//          obvious action.
// USED BY: every feature list, board, and feed
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Types ------------------------------------------------------------------
export type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  /** Usually one <Button>; rendered under the description. */
  action?: ReactNode
  className?: string
}

// ---- Component --------------------------------------------------------------

/**
 * Centered empty-state block for lists and boards.
 * Keep `description` to one actionable sentence.
 */
export function EmptyState({
  icon: StateIcon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={mergeComponentClasses(
        'flex flex-col items-center justify-center gap-2 rounded-control border border-dashed border-subtle bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <StateIcon className="size-8 text-muted" aria-hidden />
      <p className="font-semibold text-primary">{title}</p>
      <p className="max-w-sm text-sm text-muted">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
