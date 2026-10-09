// =============================================================================
// FILE:    apps/web/src/features/ideas/components/ice-score-input.tsx
// PURPOSE: The three ICE sliders (Impact, Confidence, Ease) with a live
//          preview of the computed score. Saving happens on release, so
//          dragging stays cheap and the server sees settled values.
// USED BY: idea-detail-drawer.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { ReactNode } from 'react'
import { calculateIceScore } from '@ideo/shared'
import { useUpdateIdea } from '../hooks/use-idea-mutations'

// ---- Types ------------------------------------------------------------------
type IceScoreInputProps = {
  ideaId: string
  impactScore: number | null
  confidenceScore: number | null
  easeScore: number | null
}

// ---- Constants --------------------------------------------------------------

/** The three sliders, in display order, with their field names. */
const ICE_DIMENSIONS = [
  { field: 'impactScore', label: 'Impact', description: 'How much difference would it make?' },
  { field: 'confidenceScore', label: 'Confidence', description: 'How sure are we it will work?' },
  { field: 'easeScore', label: 'Ease', description: 'How cheap is it to try?' },
] as const

// ---- Component --------------------------------------------------------------

/**
 * Renders the three ICE sliders and the computed score.
 * Each slider saves on release (`onChange` during drag, commit on mouseup).
 */
export function IceScoreInput({ ideaId, impactScore, confidenceScore, easeScore }: IceScoreInputProps) {
  const updateIdea = useUpdateIdea()

  const currentScores = { impactScore, confidenceScore, easeScore }
  const computedIceScore = calculateIceScore(currentScores)

  function saveScores(scoreField: keyof typeof currentScores, scoreValue: number) {
    if (updateIdea.isPending) return
    updateIdea.mutate({ ideaId, updateFields: { [scoreField]: scoreValue } })
  }

  return (
    <div className="flex flex-col gap-3">
      {ICE_DIMENSIONS.map(({ field, label, description }) => {
        const dimensionScore = currentScores[field] ?? 5
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
              onChange={(changeEvent) => saveScores(field, Number(changeEvent.target.value))}
              aria-label={`${label} score`}
              className="h-1.5 w-full cursor-pointer accent-[var(--accent)]"
            />
          </label>
        )
      })}

      <p className="text-sm text-muted">
        ICE score:{' '}
        {computedIceScore !== null ? (
          <span className="font-mono font-semibold text-accent">{computedIceScore}</span>
        ) : (
          'set all three to rank this idea'
        )}
        {updateIdea.isPending ? <span className="ml-2 font-mono text-xs">saving…</span> : null}
      </p>
    </div>
  )
}

/** Keeps ReactNode import used if the file grows grouped rows later. */
export type { ReactNode as IceScoreInputNode }
