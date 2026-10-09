// =============================================================================
// FILE:    packages/shared/src/calculate-ice-score.ts
// PURPOSE: The single ICE score calculation (Impact, Confidence, Ease), shared
//          so the API, the UI, and the export can never compute it differently.
// USED BY: packages/shared/src/index.ts, idea ranking (web + worker)
// =============================================================================

// ---- Types ------------------------------------------------------------------

/** The three ICE inputs. Any missing input means the idea has no score yet. */
export type IceScoreInputs = {
  impactScore: number | null | undefined
  confidenceScore: number | null | undefined
  easeScore: number | null | undefined
}

// ---- Pure calculations ------------------------------------------------------

/**
 * Calculates the ICE score: the mean of impact, confidence, and ease, rounded
 * to one decimal. Returns `null` when any of the three inputs is missing —
 * a half-scored idea must not look ranked.
 */
export function calculateIceScore(scoreInputs: IceScoreInputs): number | null {
  const { impactScore, confidenceScore, easeScore } = scoreInputs

  const hasAllThreeScores =
    typeof impactScore === 'number' &&
    typeof confidenceScore === 'number' &&
    typeof easeScore === 'number'

  if (!hasAllThreeScores) {
    return null
  }

  const scoreSum = impactScore + confidenceScore + easeScore
  const scoreMean = scoreSum / 3

  return Math.round(scoreMean * 10) / 10
}
