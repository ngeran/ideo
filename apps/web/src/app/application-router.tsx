// =============================================================================
// FILE:    apps/web/src/app/application-router.tsx
// PURPOSE: The route tree and router instance. Code-based routing keeps the
//          foundation lean; sections render placeholder pages until their
//          feature phases land.
// USED BY: app/application-root.tsx, command palette navigation
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { IdeaBoardPage } from '../features/ideas/components/idea-board-page'
import { PlanPage } from '../features/plans/components/plan-page'
import { PlansPage } from '../features/plans/components/plans-page'
import { JoinPage } from '../features/workspaces/components/join-page'
import { WorkspacePage } from '../features/workspaces/components/workspace-page'
import { ApplicationShell } from './application-shell'
import { OverviewPage } from './overview-page'
import { SectionPlaceholderPage } from './section-placeholder-page'

// ---- Route tree -------------------------------------------------------------

/** Root route: every page renders inside the application shell. */
const rootRoute = createRootRoute({ component: ApplicationShell })

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: OverviewPage,
})

/** Phase 4: the idea board (cards, voting, comments, ICE scoring, stages). */
const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/board',
  component: IdeaBoardPage,
})

/** Phase 6: the workspace's plans (promoted ideas, progress, timelines). */
const plansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plans',
  component: PlansPage,
})

/** Phase 6: one plan — summary, milestone timeline, and the task board. */
const planDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/plans/$planId',
  component: PlanPage,
})

/** Tasks live inside plans; this section waits for a cross-plan view. */
const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks',
  component: () => (
    <SectionPlaceholderPage
      title="Tasks"
      description="Task boards live inside each plan — open a plan to drag tasks across To do, Doing, and Done."
    />
  ),
})

const sessionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sessions',
  component: () => (
    <SectionPlaceholderPage
      title="Brainstorm sessions"
      description="Timeboxed live sessions with spark prompts. Lands in Phase 8."
    />
  ),
})

const activityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/activity',
  component: () => (
    <SectionPlaceholderPage
      title="Activity feed"
      description="Who did what, live. Lands in Phase 9."
    />
  ),
})

/** Phase 3: one workspace's home (members, invites). */
const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspaces/$workspaceId',
  component: WorkspacePage,
})

/** Phase 3: invite-link landing with an optional pre-filled code. */
const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/join',
  validateSearch: (searchRecord: Record<string, unknown>): { code?: string } => ({
    code:
      typeof searchRecord.code === 'string' && searchRecord.code.length > 0
        ? searchRecord.code
        : undefined,
  }),
  component: JoinPage,
})

const routeTree = rootRoute.addChildren([
  overviewRoute,
  boardRoute,
  plansRoute,
  planDetailRoute,
  tasksRoute,
  sessionsRoute,
  activityRoute,
  workspaceRoute,
  joinRoute,
])

// ---- Router instance ----------------------------------------------------------
export const applicationRouter = createRouter({ routeTree, defaultPreload: 'intent' })

// Makes Link/useNavigate fully typed across the app.
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof applicationRouter
  }
}
