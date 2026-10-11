// =============================================================================
// FILE:    apps/web/src/features/ideas/components/idea-stage-select.tsx
// PURPOSE: Select for moving an idea along the idea-to-reality pipeline.
//          Saving happens on change; a pending note shows while in flight.
// USED BY: idea-detail-drawer.tsx
// =============================================================================

import type { IdeaStage } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { IDEA_STAGE_LABELS, IDEA_STAGE_VALUES } from '@ideo/shared'
import { mergeComponentClasses } from '../../../shared/lib/merge-component-classes'
import { useUpdateIdea } from '../hooks/use-idea-mutations'

// ---- Types ------------------------------------------------------------------
type IdeaStageSelectProps = {
  ideaId: string
  stage: IdeaStage
}

// ---- Component --------------------------------------------------------------

/** Styled native select (keyboard- and screen-reader-friendly by default). */
export function IdeaStageSelect({ ideaId, stage }: IdeaStageSelectProps) {
  const updateIdea = useUpdateIdea()

  function handleStageChange(newStage: string) {
    updateIdea.mutate({ ideaId, updateFields: { stage: newStage as IdeaStage } })
  }

  return (
    <span className="flex items-center gap-2">
      <select
        value={stage}
        onChange={(changeEvent) => handleStageChange(changeEvent.target.value)}
        aria-label="Pipeline stage"
        className={mergeComponentClasses(
          'h-9 rounded-control border border-subtle bg-card px-2 text-sm text-primary ' +
            'transition-colors duration-150 outline-none ' +
            'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ' +
            'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {IDEA_STAGE_VALUES.map((stageValue) => (
          <option key={stageValue} value={stageValue}>
            {IDEA_STAGE_LABELS[stageValue]}
          </option>
        ))}
      </select>
      {updateIdea.isPending ? <span className="font-mono text-xs text-muted">saving…</span> : null}
    </span>
  )
}
