// =============================================================================
// FILE:    apps/web/src/shared/components/ui/button.tsx
// PURPOSE: The one button component for the whole app: variants (primary,
//          secondary, ghost, danger, outline), sizes, loading state, and
//          `renderAs` for styling router Links like buttons.
// USED BY: every feature; form and dialog footers
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Types ------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  /** Renders the first child (e.g. a router Link) instead of a <button>. */
  renderAsChild?: boolean
}

// ---- Styling ----------------------------------------------------------------
const buttonVariants = cva(
  // Shared: 150 ms color transitions, visible focus ring for keyboard users.
  'inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap ' +
    'transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:pointer-events-none ' +
    'disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-contrast hover:opacity-90',
        secondary: 'bg-sunken text-primary hover:bg-subtle',
        ghost: 'text-muted hover:bg-sunken hover:text-primary',
        outline: 'border border-subtle bg-card text-primary hover:bg-sunken',
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3 text-sm [&_svg]:size-4',
        md: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg: 'h-11 px-6 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

// ---- Component --------------------------------------------------------------

/**
 * The standard button. Renders a <button> unless `renderAsChild` is set, in
 * which case it styles its single child (e.g. <Link>).
 */
export function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  renderAsChild = false,
  disabled,
  children,
  ...buttonProps
}: ButtonProps) {
  const ComponentToRender = renderAsChild ? Slot : 'button'

  return (
    <ComponentToRender
      data-variant={variant}
      className={mergeComponentClasses(buttonVariants({ variant, size }), className)}
      disabled={renderAsChild ? undefined : disabled || isLoading}
      {...buttonProps}
    >
      {isLoading ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </ComponentToRender>
  )
}
