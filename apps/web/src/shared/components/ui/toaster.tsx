// =============================================================================
// FILE:    apps/web/src/shared/components/ui/toaster.tsx
// PURPOSE: App-wide toast host (sonner) wired to the resolved theme and the
//          design tokens, so success and error toasts look native in both
//          themes without per-call styling.
// USED BY: app/application-providers.tsx (mounted once)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { Toaster as SonnerToaster } from 'sonner'
import { useTheme } from '../../hooks/use-theme'

// ---- Component --------------------------------------------------------------

/**
 * Renders the toast layer once at the app root.
 * Sonner's theme must be told explicitly because it cannot see our .dark class.
 */
export function AppToaster() {
  const { resolvedTheme } = useTheme()

  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="bottom-center"
      duration={4000}
      style={
        {
          '--normal-bg': 'var(--surface-card)',
          '--normal-text': 'var(--text-primary)',
          '--normal-border': 'var(--border-subtle)',
          '--border-radius': 'var(--radius-control)',
        } as const
      }
    />
  )
}
