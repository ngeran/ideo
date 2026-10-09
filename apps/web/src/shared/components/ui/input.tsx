// =============================================================================
// FILE:    apps/web/src/shared/components/ui/input.tsx
// PURPOSE: Text input styled with theme tokens: comfortable touch target,
//          visible focus ring, correct dark-mode rendering via color-scheme.
// USED BY: forms across features (idea composer, comments, invites)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Types ------------------------------------------------------------------
export type InputProps = ComponentProps<'input'>

// ---- Component --------------------------------------------------------------

/** Single-line text input. Sizes and icons via className. */
export function Input({ className, ...inputProps }: InputProps) {
  return (
    <input
      className={mergeComponentClasses(
        'flex h-10 w-full rounded-control border border-subtle bg-card px-3 py-2 text-sm text-primary ' +
          'placeholder:text-muted transition-colors duration-150 outline-none ' +
          'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ' +
          'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...inputProps}
    />
  )
}
