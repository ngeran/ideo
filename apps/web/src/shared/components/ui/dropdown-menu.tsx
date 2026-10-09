// =============================================================================
// FILE:    apps/web/src/shared/components/ui/dropdown-menu.tsx
// PURPOSE: Menu primitives on Radix (theme toggle, workspace switcher, card
//          menus): keyboard navigation and focus management come free.
// USED BY: theme-toggle.tsx, later: workspace switcher, idea card menus
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Re-exports -------------------------------------------------------------
export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuSeparator = DropdownMenuPrimitive.Separator

// ---- Components -------------------------------------------------------------

/** Panel of menu items; positioned relative to the trigger. */
export function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 6,
  ...contentProps
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={mergeComponentClasses(
          'z-50 min-w-40 rounded-control border border-subtle bg-card p-1 text-sm shadow-lg',
          className,
        )}
        {...contentProps}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

/** One selectable row; highlights on hover and keyboard focus. */
export function DropdownMenuItem({
  className,
  ...itemProps
}: ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={mergeComponentClasses(
        'flex cursor-default items-center gap-2 rounded-control px-2.5 py-1.5 outline-none ' +
          'transition-colors duration-150 data-[highlighted]:bg-sunken data-[highlighted]:text-primary',
        className,
      )}
      {...itemProps}
    />
  )
}

/** Section heading inside a menu. */
export function DropdownMenuLabel({
  className,
  ...labelProps
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={mergeComponentClasses('px-2.5 py-1.5 text-xs font-medium text-muted font-mono', className)}
      {...labelProps}
    />
  )
}
