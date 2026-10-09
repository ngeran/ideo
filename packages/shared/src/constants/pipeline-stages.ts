// =============================================================================
// FILE:    packages/shared/src/constants/pipeline-stages.ts
// PURPOSE: The idea-to-reality pipeline stages (the heart of the product) and
//          their human-readable labels, shared by API validation and UI badges.
// USED BY: packages/shared/src/index.ts, idea feature code (web + worker)
// =============================================================================

// ---- Constants --------------------------------------------------------------

/**
 * Pipeline stages, in pipeline order. The database CHECK constraint and the
 * Zod schema both derive from this list, so they can never drift apart.
 */
export const IDEA_STAGE_VALUES = ['spark', 'shaping', 'validated', 'planned', 'launched'] as const

/** Human-readable label for each stage, keyed by stage value. */
export const IDEA_STAGE_LABELS: Record<IdeaStage, string> = {
  spark: 'Spark',
  shaping: 'Shaping',
  validated: 'Validated',
  planned: 'Planned',
  launched: 'Launched',
}

// ---- Types ------------------------------------------------------------------

/** One stage of the idea-to-reality pipeline. */
export type IdeaStage = (typeof IDEA_STAGE_VALUES)[number]
