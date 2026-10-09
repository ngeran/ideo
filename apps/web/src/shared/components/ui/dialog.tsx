// =============================================================================
// FILE:    apps/web/src/shared/components/ui/dialog.tsx
// PURPOSE: Modal dialog primitives on Radix: focus trap, escape to close,
//          scroll lock, and accessible titles — styled with theme tokens.
// USED BY: idea drawer (phase 4), confirms, command menu
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Re-exports -------------------------------------------------------------
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

// ---- Components -------------------------------------------------------------

/** Dimmed backdrop behind the dialog; click to dismiss. */
export function DialogOverlay({ className, ...overlayProps }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={mergeComponentClasses('fixed inset-0 z-40 bg-black/50', className)}
      {...overlayProps}
    />
  )
}

/** The dialog panel: centered on desktop, bottom sheet on small screens. */
export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...contentProps
}: ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={mergeComponentClasses(
          'fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-control border border-subtle bg-card p-5 ' +
            'shadow-xl outline-none sm:inset-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-lg ' +
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-control',
          className,
        )}
        {...contentProps}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-control p-1 text-muted transition-colors duration-150 outline-none hover:bg-sunken hover:text-primary focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Accessible title (always render one, visually or not). */
export function DialogTitle({ className, ...titleProps }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={mergeComponentClasses('text-base font-semibold text-primary', className)}
      {...titleProps}
    />
  )
}

/** Supporting one-liner under the title. */
export function DialogDescription({
  className,
  ...descriptionProps
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={mergeComponentClasses('text-sm text-muted', className)}
      {...descriptionProps}
    />
  )
}

/** Right-aligned action strip for the bottom of a dialog. */
export function DialogFooter({ className, ...footerProps }: ComponentProps<'div'>) {
  return (
    <div className={mergeComponentClasses('flex flex-row justify-end gap-2', className)} {...footerProps} />
  )
}
