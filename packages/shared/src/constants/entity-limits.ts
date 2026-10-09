// =============================================================================
// FILE:    packages/shared/src/constants/entity-limits.ts
// PURPOSE: Maximum lengths for user-entered text, in one place so the Zod
//          schemas, the UI maxLength attributes, and the database never drift.
// USED BY: packages/shared/src/index.ts, validation schemas, form components
// =============================================================================

// ---- Constants --------------------------------------------------------------

/**
 * Text limits per entity. Keep these generous enough for real use but small
 * enough that a single request can never carry pathological payloads.
 */
export const ENTITY_LIMITS = {
  workspaceName: 60,
  ideaTitle: 120,
  ideaDescription: 4000,
  ideaTag: 24,
  ideaTagsPerIdea: 6,
  commentText: 2000,
  planTitle: 120,
  planSummary: 2000,
  milestoneTitle: 120,
  taskTitle: 120,
  brainstormTopic: 120,
} as const
