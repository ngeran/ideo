// =============================================================================
// FILE:    apps/web/src/features/ideas/components/ice-score-input.tsx
// PURPOSE: The three ICE sliders (Impact, Confidence, Ease) with a live
//          preview of the computed score. Dragging updates a local draft;
//          the server only sees the settled value on release, so one drag is
//          one request instead of one per pixel.
// USED BY: idea-detail-drawer.tsx
// =============================================================================

import { calculateIceScore } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { useState } from 'react'
import { useUpdateIdea } from '../hooks/use-idea-mutations'

// ---- Types ------------------------------------------------------------------
type IceScoreInputProps = {
  ideaId: string
  impactScore: number | null
  confidenceScore: number | null
  easeScore: number | null
}

/** The names of the three score fields, as the update API expects them. */
type IceScoreField = 'impactScore' | 'confidenceScore' | 'easeScore'

// ---- Constants --------------------------------------------------------------

/** The three sliders, in display order, with their field names. */
const ICE_DIMENSIONS: Array<{ field: IceScoreField; label: string; description: string }> = [
  { field: 'impactScore', label: 'Impact', description: 'How much difference would it make?' },
  { field: 'confidenceScore', label: 'Confidence', description: 'How sure are we it will work?' },
  { field: 'easeScore', label: 'Ease', description: 'How cheap is it to try?' },
]

// ---- Component --------------------------------------------------------------

/**
 * Renders the three ICE sliders and the computed score.
 * While dragging, changes stay in a local draft; releasing the slider (mouse,
 * touch, or keyboard) commits one update request with the settled value.
 */
export function IceScoreInput({
  ideaId,
  impactScore,
  confidenceScore,
  easeScore,
}: IceScoreInputProps) {
  const updateIdea = useUpdateIdea()
  const [draftedScores, setDraftedScores] = useState<Partial<Record<IceScoreField, number>>>({})

  const settledScores: Record<IceScoreField, number | null> = {
    impactScore,
    confidenceScore,
    easeScore,
  }
  /** What the sliders show: the draft value when one is mid-drag, else the server value. */
  const displayedScores = { ...settledScores, ...draftedScores }
  const displayedIceScore = calculateIceScore(displayedScores)

  /** Moves the draft while the slider is held down; nothing is sent yet. */
  function draftScore(scoreField: IceScoreField, scoreValue: number) {
    setDraftedScores((previousDrafts) => ({ ...previousDrafts, [scoreField]: scoreValue }))
  }

  /** Sends the settled value once per release and clears that slider's draft. */
  function commitScore(scoreField: IceScoreField, scoreValue: number) {
    setDraftedScores(({ [scoreField]: _settledDraft, ...remainingDrafts }) => remainingDrafts)
    if (settledScores[scoreField] !== scoreValue && !updateIdea.isPending) {
      updateIdea.mutate({ ideaId, updateFields: { [scoreField]: scoreValue } })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {ICE_DIMENSIONS.map(({ field, label, description }) => {
        const dimensionScore = displayedScores[field] ?? 5
        return (
          <label key={field} className="flex flex-col gap-1" title={description}>
            <span className="flex items-center justify-between text-sm">
              <span className="font-medium text-primary">{label}</span>
              <span className="font-mono text-xs text-muted">{dimensionScore}/10</span>
            </span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={dimensionScore}
              onChange={(changeEvent) => draftScore(field, Number(changeEvent.target.value))}
              onPointerUp={(pointerEvent) =>
                commitScore(field, Number(pointerEvent.currentTarget.value))
              }
              onKeyUp={(keyEvent) => commitScore(field, Number(keyEvent.currentTarget.value))}
              onBlur={(blurEvent) => commitScore(field, Number(blurEvent.currentTarget.value))}
              aria-label={`${label} score`}
              aria-valuetext={`${dimensionScore} out of 10`}
              className="h-1.5 w-full cursor-pointer accent-[var(--accent)]"
            />
          </label>
        )
      })}

      <p className="text-sm text-muted">
        ICE score:{' '}
        {displayedIceScore !== null ? (
          <span className="font-mono font-semibold text-accent">{displayedIceScore}</span>
        ) : (
          'set all three to rank this idea'
        )}
        {updateIdea.isPending ? <span className="ml-2 font-mono text-xs">saving…</span> : null}
      </p>
    </div>
  )
}
