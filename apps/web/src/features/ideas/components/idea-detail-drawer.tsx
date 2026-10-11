// =============================================================================
// FILE:    apps/web/src/features/ideas/components/idea-detail-drawer.tsx
// PURPOSE: The idea drawer: full description, stage control, ICE scoring,
//          tags, voting, and the comment thread. Promoting to a plan joins
//          here in Phase 6.
// USED BY: idea-board-page.tsx
// =============================================================================

import type { WorkspaceViewer } from '@ideo/shared'
import { Lightbulb } from 'lucide-react'
// ---- Imports ----------------------------------------------------------------
import { useState } from 'react'
import { UserAvatar } from '../../../shared/components/ui/avatar'
import { Button } from '../../../shared/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '../../../shared/components/ui/drawer'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { Skeleton } from '../../../shared/components/ui/skeleton'
import { Textarea } from '../../../shared/components/ui/textarea'
import { useIdeaDetail } from '../hooks/use-idea-detail'
import { useAddIdeaComment } from '../hooks/use-idea-mutations'
import { IceScoreInput } from './ice-score-input'
import { IdeaStageSelect } from './idea-stage-select'
import { IdeaTagEditor } from './idea-tag-editor'
import { IdeaViewers } from './idea-viewers'
import { IdeaVoteButton } from './idea-vote-button'
import { PromoteToPlanButton } from './promote-to-plan-button'

// ---- Types ------------------------------------------------------------------
export type IdeaDetailDrawerProps = {
  /** The open idea; null keeps the drawer's query disabled. */
  ideaId: string | null
  isOpen: boolean
  /** Teammates currently viewing this idea (current user already excluded). */
  currentViewers: WorkspaceViewer[]
  /** Called after promoting the open idea (pages typically navigate). */
  onPromotedToPlan: (planId: string) => void
  onOpenChange: (isOpen: boolean) => void
}

// ---- Internal helpers -------------------------------------------------------

/** Renders a comment's creation time in the reader's locale. */
function formatCommentedAt(createdAt: string): string {
  return new Date(createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// ---- Section components -----------------------------------------------------

/** The comment thread: oldest first, one row per comment. */
function IdeaCommentList({
  comments,
}: {
  comments: NonNullable<ReturnType<typeof useIdeaDetail>['data']>['comments']
}) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted">No comments yet — start the discussion.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((ideaComment) => (
        <li
          key={ideaComment.id}
          className="flex flex-col gap-1 border-b border-subtle pb-3 last:border-b-0"
        >
          <span className="flex items-center gap-2 text-xs text-muted">
            <UserAvatar
              displayName={ideaComment.author.displayName}
              avatarColor={ideaComment.author.avatarColor}
              className="size-5"
            />
            <span className="font-medium text-primary">{ideaComment.author.displayName}</span>
            {formatCommentedAt(ideaComment.createdAt)}
          </span>
          <p className="whitespace-pre-wrap text-sm text-primary">{ideaComment.commentText}</p>
        </li>
      ))}
    </ul>
  )
}

/** The comment composer: disabled while the drawer has no open idea. */
function IdeaCommentComposer({ ideaId }: { ideaId: string }) {
  const [commentText, setCommentText] = useState('')
  const addComment = useAddIdeaComment(ideaId, () => setCommentText(''))

  async function handleCommentSubmit() {
    await addComment.mutateAsync(commentText)
  }

  return (
    <form
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault()
        void handleCommentSubmit()
      }}
      className="flex flex-col gap-2"
    >
      <Textarea
        value={commentText}
        onChange={(changeEvent) => setCommentText(changeEvent.target.value)}
        placeholder="Add a comment…"
        aria-label="Comment text"
        rows={2}
      />
      <Button
        type="submit"
        size="sm"
        isLoading={addComment.isPending}
        disabled={commentText.trim().length === 0}
        className="self-end"
      >
        Comment
      </Button>
    </form>
  )
}

// ---- Component --------------------------------------------------------------

/** Right-side drawer with everything about one idea. */
export function IdeaDetailDrawer({
  ideaId,
  isOpen,
  currentViewers,
  onPromotedToPlan,
  onOpenChange,
}: IdeaDetailDrawerProps) {
  const ideaDetailQuery = useIdeaDetail(ideaId)

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        {ideaDetailQuery.isPending || ideaDetailQuery.data === undefined ? (
          <div className="flex flex-col gap-3 pr-8">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : ideaDetailQuery.isError ? (
          <EmptyState
            icon={Lightbulb}
            title="Idea unavailable"
            description="It may have been deleted, or you may have lost access."
          />
        ) : (
          <DrawerBody
            detailResponse={ideaDetailQuery.data}
            currentViewers={currentViewers}
            onPromotedToPlan={onPromotedToPlan}
          />
        )}
      </DrawerContent>
    </Drawer>
  )
}

// ---- Body -------------------------------------------------------------------

/** The drawer's content once the detail has loaded. */
function DrawerBody({
  detailResponse,
  currentViewers,
  onPromotedToPlan,
}: {
  detailResponse: NonNullable<ReturnType<typeof useIdeaDetail>['data']>
  currentViewers: WorkspaceViewer[]
  onPromotedToPlan: (planId: string) => void
}) {
  const { idea, comments } = detailResponse

  return (
    <div className="flex flex-col gap-5 pr-8">
      <div className="flex flex-col gap-1">
        <DrawerTitle>{idea.title}</DrawerTitle>
        <DrawerDescription>
          {idea.author !== null
            ? `Added by ${idea.author.displayName}`
            : 'Author hidden (anonymous idea)'}
        </DrawerDescription>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <IdeaStageSelect ideaId={idea.id} stage={idea.stage} />
        <IdeaVoteButton
          ideaId={idea.id}
          voteCount={idea.voteCount}
          isVoteCastByCurrentUser={idea.hasVotedByCurrentUser}
        />
        <IdeaViewers viewers={currentViewers} />
        <PromoteToPlanButton ideaId={idea.id} onPromoted={onPromotedToPlan} />
      </div>

      {idea.description ? (
        <p className="whitespace-pre-wrap text-sm text-primary">{idea.description}</p>
      ) : (
        <p className="text-sm text-muted">No description yet.</p>
      )}

      <section className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted">ICE SCORING</p>
        <IceScoreInput
          ideaId={idea.id}
          impactScore={idea.impactScore}
          confidenceScore={idea.confidenceScore}
          easeScore={idea.easeScore}
        />
      </section>

      <section className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted">TAGS</p>
        <IdeaTagEditor ideaId={idea.id} tags={idea.tags} />
      </section>

      <section className="flex flex-col gap-2">
        <p className="font-mono text-xs text-muted">COMMENTS {comments.length}</p>
        <IdeaCommentList comments={comments} />
        <IdeaCommentComposer ideaId={idea.id} />
      </section>
    </div>
  )
}
