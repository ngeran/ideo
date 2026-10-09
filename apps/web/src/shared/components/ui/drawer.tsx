// =============================================================================
// FILE:    apps/web/src/shared/components/ui/drawer.tsx
// PURPOSE: Right-side slide-in panel (the idea drawer's home): Radix Dialog
//          semantics — focus trap, escape, scroll lock — with drawer layout.
// USED BY: idea-detail-drawer.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Re-exports -------------------------------------------------------------
export const Drawer = DialogPrimitive.Root
export const DrawerTrigger = DialogPrimitive.Trigger

// ---- Components -------------------------------------------------------------

/** The drawer panel: docked right, full height on all screen sizes. */
export function DrawerContent({
  className,
  children,
  ...contentProps
}: ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50" />
      <DialogPrimitive.Content
        className={mergeComponentClasses(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-subtle bg-card p-5 shadow-xl outline-none',
          className,
        )}
        {...contentProps}
      >
        <DialogPrimitive.Close
          aria-label="Close panel"
          className="absolute right-4 top-4 rounded-control p-1 text-muted transition-colors duration-150 outline-none hover:bg-sunken hover:text-primary focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="size-4" aria-hidden />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** The drawer's accessible title. */
export function DrawerTitle({ className, ...titleProps }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={mergeComponentClasses('pr-8 text-base font-semibold text-primary', className)}
      {...titleProps}
    />
  )
}

/** Supporting text under the drawer title. */
export function DrawerDescription({
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
