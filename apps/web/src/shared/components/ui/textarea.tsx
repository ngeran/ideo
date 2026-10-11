// =============================================================================
// FILE:    apps/web/src/shared/components/ui/textarea.tsx
// PURPOSE: Multi-line text input styled like the Input primitive: theme
//          tokens, visible focus ring, comfortable touch target, and correct
//          dark-mode rendering via color-scheme.
// USED BY: idea description, comment composer
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Types ------------------------------------------------------------------
export type TextareaProps = ComponentProps<'textarea'>

// ---- Component --------------------------------------------------------------

/** Multi-line text input. Set `rows` per use; resizing stays vertical. */
export function Textarea({ className, ...textareaProps }: TextareaProps) {
  return (
    <textarea
      className={mergeComponentClasses(
        'flex min-h-20 w-full resize-y rounded-control border border-subtle bg-card px-3 py-2 text-sm text-primary ' +
          'placeholder:text-muted transition-colors duration-150 outline-none ' +
          'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 ' +
          'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...textareaProps}
    />
  )
}
