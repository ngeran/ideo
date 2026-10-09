// =============================================================================
// FILE:    apps/web/src/app/app-sidebar.tsx
// PURPOSE: Desktop navigation sidebar: logo, section links with active state,
//          theme toggle pinned to the bottom.
// USED BY: app/application-shell.tsx (desktop layout only)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { Lightbulb } from 'lucide-react'
import { ThemeToggle } from '../shared/components/ui/theme-toggle'
import { NAVIGATION_ITEMS } from './navigation-items'

// ---- Types ------------------------------------------------------------------
type AppSidebarProps = {
  /** Workspace name shown under the logo once workspaces exist (phase 3). */
  workspaceName: string
}

// ---- Component helpers ------------------------------------------------------

/** Renders one nav row, re-used for the collapsed icon rail. */
function SidebarLink({ label, path, Icon }: { label: string; path: string; Icon: LucideIcon }) {
  return (
    <Link
      to={path}
      aria-label={label}
      className="flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium text-muted outline-none transition-colors duration-150 hover:bg-sunken hover:text-primary focus-visible:ring-2 focus-visible:ring-accent aria-current-page:bg-sunken aria-current-page:text-accent"
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </Link>
  )
}

// ---- Component --------------------------------------------------------------

/** Fixed left sidebar for md-and-wider screens. */
export function AppSidebar({ workspaceName }: AppSidebarProps) {
  return (
    <aside className="flex h-dvh w-60 shrink-0 flex-col gap-6 border-r border-subtle bg-card p-4">
      <Link
        to="/"
        className="flex items-center gap-2.5 rounded-control px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label="Ideo overview"
      >
        <Lightbulb className="size-6 text-accent" aria-hidden />
        <span className="flex flex-col">
          <span className="font-mono text-base font-semibold text-primary">Ideo</span>
          <span className="max-w-40 truncate text-xs text-muted">{workspaceName}</span>
        </span>
      </Link>

      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
        {NAVIGATION_ITEMS.map((navigationItem) => (
          <SidebarLink key={navigationItem.itemId} {...navigationItem} />
        ))}
      </nav>

      <div className="flex items-center justify-between rounded-control px-2">
        <span className="text-xs text-muted font-mono">v0.1.0</span>
        <ThemeToggle />
      </div>
    </aside>
  )
}
