// =============================================================================
// FILE:    apps/web/src/app/application-shell.tsx
// PURPOSE: The application chrome around every page: desktop sidebar, mobile
//          top bar and bottom tabs, the global Ctrl/⌘ + K listener, and the
//          command palette itself.
// USED BY: app/application-router.tsx (root route component)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Outlet } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { AppBottomTabs } from './app-bottom-tabs'
import { AppSidebar } from './app-sidebar'
import { AppTopBar } from './app-topbar'
import { NAVIGATION_ITEMS } from './navigation-items'
import { CommandMenu } from '../shared/components/ui/command-menu'
import type { CommandMenuNavigation } from '../shared/components/ui/command-menu'

// ---- Constants --------------------------------------------------------------

/** Placeholder until workspaces land in Phase 3. */
const CURRENT_WORKSPACE_NAME = 'Your workspace'

/** The command palette's "Navigate" group mirrors the primary sections. */
const COMMAND_NAVIGATION: ReadonlyArray<CommandMenuNavigation> = NAVIGATION_ITEMS.map(
  ({ label, path, Icon }) => ({ label: `Go to ${label}`, path, Icon }),
)

// ---- Component --------------------------------------------------------------

/**
 * Responsive application chrome. Renders <Outlet/> for the active page.
 * Also owns the palette open state and the global keyboard shortcut.
 */
export function ApplicationShell() {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false)

  // Global Ctrl/⌘ + K shortcut for the command palette.
  useEffect(() => {
    function handleShortcutKeydown(keyboardEvent: KeyboardEvent) {
      const isPaletteShortcut =
        keyboardEvent.key.toLowerCase() === 'k' &&
        (keyboardEvent.metaKey || keyboardEvent.ctrlKey) &&
        !keyboardEvent.altKey &&
        !keyboardEvent.shiftKey

      if (isPaletteShortcut) {
        keyboardEvent.preventDefault()
        setIsCommandMenuOpen((wasOpen) => !wasOpen)
      }
    }

    window.addEventListener('keydown', handleShortcutKeydown)
    return () => window.removeEventListener('keydown', handleShortcutKeydown)
  }, [])

  return (
    <div className="flex min-h-dvh">
      <a
        href="#page-content"
        className="sr-only rounded-control bg-accent px-3 py-2 text-sm text-accent-contrast focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>

      {/* Desktop chrome */}
      <div className="hidden md:block">
        <AppSidebar workspaceName={CURRENT_WORKSPACE_NAME} />
      </div>

      {/* Page column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar workspaceName={CURRENT_WORKSPACE_NAME} onOpenCommandMenu={() => setIsCommandMenuOpen(true)} />
        <main id="page-content" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      <AppBottomTabs />

      <CommandMenu
        isOpen={isCommandMenuOpen}
        onOpenChange={setIsCommandMenuOpen}
        navigationCommands={COMMAND_NAVIGATION}
      />
    </div>
  )
}
