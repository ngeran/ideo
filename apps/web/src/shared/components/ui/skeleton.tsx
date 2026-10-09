// =============================================================================
// FILE:    apps/web/src/shared/components/ui/skeleton.tsx
// PURPOSE: Pulse placeholder shown while data loads, so layouts do not jump
//          when real content arrives.
// USED BY: feature pages while TanStack Query data is loading
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Types ------------------------------------------------------------------
export type SkeletonProps = ComponentProps<'div'>

// ---- Component --------------------------------------------------------------

/**
 * A shimmering block that mimics the shape of incoming content.
 * Inherits its size from className (e.g. `h-4 w-32`).
 */
export function Skeleton({ className, ...skeletonProps }: SkeletonProps) {
  return <div aria-hidden className={mergeComponentClasses('animate-pulse rounded-control bg-sunken', className)} {...skeletonProps} />
}
