// =============================================================================
// FILE:    apps/web/src/features/ideas/components/promote-to-plan-button.tsx
// PURPOSE: The one-button idea-to-plan promotion: turns the idea into a draft
//          plan and moves the idea to the planned stage.
// USED BY: idea-detail-drawer.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Map as MapIcon } from 'lucide-react'
import { Button } from '../../../shared/components/ui/button'
import { usePromoteIdeaToPlan } from '../../plans/hooks/use-plan-mutations'

// ---- Types ------------------------------------------------------------------
type PromoteToPlanButtonProps = {
  ideaId: string
  /** Called with the new plan's id (pages typically navigate to it). */
  onPromoted: (planId: string) => void
}

// ---- Component --------------------------------------------------------------

/** Promotes the idea; disabled while the request runs. */
export function PromoteToPlanButton({ ideaId, onPromoted }: PromoteToPlanButtonProps) {
  const promoteIdea = usePromoteIdeaToPlan(onPromoted)

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => promoteIdea.mutate(ideaId)}
      isLoading={promoteIdea.isPending}
    >
      <MapIcon aria-hidden /> Promote to plan
    </Button>
  )
}
