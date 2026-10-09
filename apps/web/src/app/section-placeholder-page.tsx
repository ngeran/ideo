// =============================================================================
// FILE:    apps/web/src/app/section-placeholder-page.tsx
// PURPOSE: Temporary page shown for sections whose feature phase has not run
//          yet, so every route is real and navigable from day one.
// USED BY: app/application-router.tsx (board, plans, tasks, sessions, activity)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Construction } from 'lucide-react'
import { EmptyState } from '../shared/components/ui/empty-state'

// ---- Types ------------------------------------------------------------------
type SectionPlaceholderPageProps = {
  title: string
  description: string
}

// ---- Component --------------------------------------------------------------

/** Centered placeholder using the standard empty-state look. */
export function SectionPlaceholderPage({ title, description }: SectionPlaceholderPageProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-primary">{title}</h1>
      <EmptyState icon={Construction} title="Not built yet" description={description} />
    </div>
  )
}
