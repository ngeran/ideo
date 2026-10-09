// =============================================================================
// FILE:    apps/web/src/features/ideas/components/idea-vote-button.tsx
// PURPOSE: Button that lets the current user add or remove their vote on an
//          idea. Optimistic: the count moves the moment you click.
// USED BY: idea-card.tsx, idea-detail-drawer.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { ArrowBigUp } from 'lucide-react'
import { mergeComponentClasses } from '../../../shared/lib/merge-component-classes'
import { useToggleIdeaVote } from '../hooks/use-idea-mutations'

// ---- Types ------------------------------------------------------------------
type IdeaVoteButtonProps = {
  ideaId: string
  voteCount: number
  isVoteCastByCurrentUser: boolean
}

// ---- Component --------------------------------------------------------------
export function IdeaVoteButton({ ideaId, voteCount, isVoteCastByCurrentUser }: IdeaVoteButtonProps) {
  const { mutate: toggleVote, isPending } = useToggleIdeaVote(ideaId)

  return (
    <button
      type="button"
      onClick={() => toggleVote()}
      disabled={isPending}
      aria-pressed={isVoteCastByCurrentUser}
      aria-label={isVoteCastByCurrentUser ? 'Remove your vote' : 'Vote for this idea'}
      className={mergeComponentClasses(
        'inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm transition-colors duration-150 outline-none',
        'hover:bg-sunken focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60',
        isVoteCastByCurrentUser ? 'font-semibold text-accent' : 'text-muted',
      )}
    >
      <ArrowBigUp className="size-4" aria-hidden />
      {voteCount}
    </button>
  )
}
