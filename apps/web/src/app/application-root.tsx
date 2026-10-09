// =============================================================================
// FILE:    apps/web/src/app/application-root.tsx
// PURPOSE: Top-level React component: providers around the router. Pure
//          composition — no logic lives here.
// USED BY: apps/web/src/main.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { RouterProvider } from '@tanstack/react-router'
import { ApplicationProviders } from './application-providers'
import { applicationRouter } from './application-router'

// ---- Component --------------------------------------------------------------

/** The complete application: providers wrapping the router outlet tree. */
export function ApplicationRoot() {
  return (
    <ApplicationProviders>
      <RouterProvider router={applicationRouter} />
    </ApplicationProviders>
  )
}
