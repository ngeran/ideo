// =============================================================================
// FILE:    apps/web/src/app/application-providers.tsx
// PURPOSE: Mounts the app-wide providers in the right order: theme first (the
//          toaster reads it), then TanStack Query for server state.
// USED BY: app/application-root.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AppToaster } from '../shared/components/ui/toaster'
import { ThemeProvider } from '../shared/hooks/use-theme'
import { createApplicationQueryClient } from '../shared/lib/query-client'

// ---- Types ------------------------------------------------------------------
type ApplicationProvidersProps = { children: ReactNode }

// ---- Constants --------------------------------------------------------------

// One client for the app's lifetime; created lazily on first import.
const applicationQueryClient = createApplicationQueryClient()

// ---- Component --------------------------------------------------------------

/** Wraps children in every global provider. Mount exactly once. */
export function ApplicationProviders({ children }: ApplicationProvidersProps) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={applicationQueryClient}>
        {children}
        <AppToaster />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
