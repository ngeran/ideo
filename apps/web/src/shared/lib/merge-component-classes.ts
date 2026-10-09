// =============================================================================
// FILE:    apps/web/src/shared/lib/merge-component-classes.ts
// PURPOSE: Merges conditional class names and resolves conflicts when a
//          caller overrides a component's own classes (clsx + tailwind-merge).
// USED BY: every UI primitive in shared/components/ui
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ---- Pure functions ---------------------------------------------------------

/**
 * Combines class names (skipping falsy values) and resolves conflicting
 * Tailwind utilities so a caller's `bg-danger` beats the component's
 * `bg-accent` instead of both being emitted.
 * Returns the merged class string.
 */
export function mergeComponentClasses(
  ...classLists: Array<string | false | null | undefined>
): string {
  return twMerge(clsx(classLists))
}
