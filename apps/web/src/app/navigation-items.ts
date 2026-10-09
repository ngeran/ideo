// =============================================================================
// FILE:    apps/web/src/app/navigation-items.ts
// PURPOSE: The single list of app sections. The sidebar, the mobile bottom
//          tabs, and the command palette all render from this list, so they
//          can never disagree about routes or labels.
// USED BY: app-sidebar.tsx, app-bottom-tabs.tsx, application-shell.tsx
// =============================================================================

import type { LucideIcon } from 'lucide-react'
// ---- Imports ----------------------------------------------------------------
// `Map` is renamed so it cannot shadow the global Map constructor.
import { Activity, CalendarClock, Lightbulb, ListTodo, Map as MapIcon } from 'lucide-react'

// ---- Types ------------------------------------------------------------------

/** One primary section of the app. */
export type NavigationItem = {
  itemId: string
  label: string
  path: string
  Icon: LucideIcon
}

// ---- Constants --------------------------------------------------------------

/**
 * Primary sections in sidebar/tab order. The overview route ('/') is handled
 * separately (logo click) because it is not a tab on mobile.
 */
export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { itemId: 'board', label: 'Board', path: '/board', Icon: Lightbulb },
  { itemId: 'plans', label: 'Plans', path: '/plans', Icon: MapIcon },
  { itemId: 'tasks', label: 'Tasks', path: '/tasks', Icon: ListTodo },
  { itemId: 'sessions', label: 'Sessions', path: '/sessions', Icon: CalendarClock },
  { itemId: 'activity', label: 'Activity', path: '/activity', Icon: Activity },
]
