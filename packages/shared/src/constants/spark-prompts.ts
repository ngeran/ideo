// =============================================================================
// FILE:    packages/shared/src/constants/spark-prompts.ts
// PURPOSE: The built-in brainstorming prompts ("spark prompts") shown in
//          sessions and on empty states. Static data on purpose — no AI cost,
//          no network call, same list on every client.
// USED BY: packages/shared/src/index.ts, sessions page, empty states
// =============================================================================

// ---- Constants --------------------------------------------------------------

/**
 * Spark prompts, in display order. One is picked at random by the UI; the
 * list itself never changes at runtime.
 */
export const SPARK_PROMPTS: readonly string[] = [
  'What would make this 10x cheaper?',
  'What would we build if we had only one week?',
  'What do our users do that we never designed for?',
  'Which step of our workflow is the most boring?',
  'What would a competitor do to embarrass us here?',
  'What could we remove and still be fine?',
  'If a new teammate joined tomorrow, what would confuse them?',
  'What tiny change would make today twice as good?',
  'What are we secretly afraid to try?',
  'How would this work with no internet connection?',
]

/** Picks one prompt at random (client-side; no server round trip). */
export function pickSparkPrompt(): string {
  const randomIndex = Math.floor(Math.random() * SPARK_PROMPTS.length)
  return SPARK_PROMPTS[randomIndex] ?? 'What should we try next?'
}
