// =============================================================================
// FILE:    apps/web/src/app/app-topbar.tsx
// PURPOSE: Mobile top bar: logo, workspace name, command-palette trigger, and
//          theme toggle. The desktop layout uses the sidebar instead.
// USED BY: app/application-shell.tsx (small screens only)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Link } from '@tanstack/react-router'
import { Lightbulb, Search } from 'lucide-react'
import { Button } from '../shared/components/ui/button'
import { ThemeToggle } from '../shared/components/ui/theme-toggle'

// ---- Types ------------------------------------------------------------------
type AppTopBarProps = {
  workspaceName: string
  onOpenCommandMenu: () => void
}

// ---- Component --------------------------------------------------------------

/** Sticky top bar, visible below the `md` breakpoint. */
export function AppTopBar({ workspaceName, onOpenCommandMenu }: AppTopBarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-subtle bg-page/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Link
        to="/"
        className="flex items-center gap-2 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Ideo overview"
      >
        <Lightbulb className="size-5 text-accent" aria-hidden />
        <span className="font-mono text-sm font-semibold text-primary">Ideo</span>
      </Link>
      <span className="min-w-0 flex-1 truncate text-sm text-muted">{workspaceName}</span>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Open command menu"
        aria-keyshortcuts="Control+K Meta+K"
        onClick={onOpenCommandMenu}
        className="text-muted hover:text-primary"
      >
        <Search aria-hidden />
      </Button>
      <ThemeToggle />
    </header>
  )
}
