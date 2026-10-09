// =============================================================================
// FILE:    apps/web/src/app/app-bottom-tabs.tsx
// PURPOSE: Mobile navigation: bottom tab bar with the five primary sections,
//          icon + label, safe-area aware for the installed PWA.
// USED BY: app/application-shell.tsx (small screens only)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Link } from '@tanstack/react-router'
import { NAVIGATION_ITEMS } from './navigation-items'

// ---- Component --------------------------------------------------------------

/** Fixed bottom tab bar, visible below the `md` breakpoint. */
export function AppBottomTabs() {
  return (
    <nav
      aria-label="Primary"
      className="pb-safe-area fixed inset-x-0 bottom-0 z-30 flex border-t border-subtle bg-card/95 backdrop-blur md:hidden"
    >
      {NAVIGATION_ITEMS.map(({ itemId, label, path, Icon }) => (
        <Link
          key={itemId}
          to={path}
          aria-label={label}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[0.65rem] font-medium text-muted outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent aria-current-page:text-accent"
        >
          <Icon className="size-5" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  )
}
