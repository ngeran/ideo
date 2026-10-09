// =============================================================================
// FILE:    apps/web/src/shared/components/ui/card.tsx
// PURPOSE: Card layout primitives (shell, header, title, description, content,
//          footer) used for every panel and section in the app.
// USED BY: feature pages, empty states, overview page
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Types ------------------------------------------------------------------
export type CardProps = ComponentProps<'div'>

// ---- Components ---------------------------------------------------------------

/** Surface for grouping related content. */
export function Card({ className, ...cardProps }: CardProps) {
  return (
    <div
      className={mergeComponentClasses(
        'rounded-control border border-subtle bg-card text-primary',
        className,
      )}
      {...cardProps}
    />
  )
}

/** Top area of a card; holds CardTitle and CardDescription. */
export function CardHeader({ className, ...headerProps }: ComponentProps<'div'>) {
  return (
    <div
      className={mergeComponentClasses('flex flex-col gap-1.5 p-5', className)}
      {...headerProps}
    />
  )
}

/** The card's heading. */
export function CardTitle({ className, ...titleProps }: ComponentProps<'h3'>) {
  return (
    <h3
      className={mergeComponentClasses('font-semibold text-base leading-none', className)}
      {...titleProps}
    />
  )
}

/** Muted one-liner under the title. */
export function CardDescription({ className, ...descriptionProps }: ComponentProps<'p'>) {
  return (
    <p className={mergeComponentClasses('text-sm text-muted', className)} {...descriptionProps} />
  )
}

/** The card's body. */
export function CardContent({ className, ...contentProps }: ComponentProps<'div'>) {
  return <div className={mergeComponentClasses('p-5 pt-0', className)} {...contentProps} />
}

/** Bottom strip of a card; right-aligns actions by default. */
export function CardFooter({ className, ...footerProps }: ComponentProps<'div'>) {
  return (
    <div
      className={mergeComponentClasses('flex items-center justify-end gap-2 p-5 pt-0', className)}
      {...footerProps}
    />
  )
}
