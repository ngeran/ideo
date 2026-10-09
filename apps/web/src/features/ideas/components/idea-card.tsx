// =============================================================================
// FILE:    apps/web/src/features/ideas/components/idea-card.tsx
// PURPOSE: One idea on the board: title, stage badge, tags, vote button, and
//          comment count. Clicking the body opens the detail drawer.
// USED BY: idea-board-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { MessageSquare } from 'lucide-react'
import type { IdeaResponse } from '@ideo/shared'
import { Badge, StageBadge } from '../../../shared/components/ui/badge'
import { Card } from '../../../shared/components/ui/card'
import { UserAvatar } from '../../../shared/components/ui/avatar'
import { IDEA_STAGE_LABELS } from '@ideo/shared'
import { IdeaVoteButton } from './idea-vote-button'

// ---- Types ------------------------------------------------------------------
type IdeaCardProps = {
  idea: IdeaResponse
  onOpenIdea: (ideaId: string) => void
}

// ---- Component --------------------------------------------------------------

/** One board card. The whole body is a button for keyboard reachability. */
export function IdeaCard({ idea, onOpenIdea }: IdeaCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <button
        type="button"
        onClick={() => onOpenIdea(idea.id)}
        className="flex flex-col items-start gap-2 rounded-control text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Open idea: ${idea.title}`}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <StageBadge stage={idea.stage} />
          {idea.isAnonymous ? <Badge variant="outline">Anonymous</Badge> : null}
        </div>
        <span className="font-semibold text-primary">{idea.title}</span>
        {idea.description ? (
          <span className="line-clamp-2 text-sm text-muted">{idea.description}</span>
        ) : null}
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        {idea.tags.map((tagLabel) => (
          <Badge key={tagLabel} variant="default" className="font-mono">
            {tagLabel}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-subtle pt-2">
        <div className="flex items-center gap-2">
          <IdeaVoteButton ideaId={idea.id} voteCount={idea.voteCount} isVoteCastByCurrentUser={idea.hasVotedByCurrentUser} />
          <span className="flex items-center gap-1 text-sm text-muted" aria-label={`${idea.commentCount} comments`}>
            <MessageSquare className="size-4" aria-hidden />
            {idea.commentCount}
          </span>
        </div>

        {idea.author !== null ? (
          <span className="flex items-center gap-2 text-xs text-muted" title={`Added by ${idea.author.displayName}`}>
            <UserAvatar displayName={idea.author.displayName} avatarColor={idea.author.avatarColor} className="size-5" />
            {idea.author.displayName.split(' ')[0]}
          </span>
        ) : (
          <span className="text-xs text-muted">{IDEA_STAGE_LABELS[idea.stage]} · hidden author</span>
        )}
      </div>
    </Card>
  )
}
