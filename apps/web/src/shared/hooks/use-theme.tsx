// =============================================================================
// FILE:    apps/web/src/shared/hooks/use-theme.tsx
// PURPOSE: ThemeProvider and useTheme hook: hold the theme choice, resolve
//          `system` against the OS preference, apply the `dark` class to
//          <html>, and keep following the OS while the choice is `system`.
// USED BY: app/application-providers.tsx (mounts it), ThemeToggle, Toaster
// =============================================================================

import type { ReactNode } from 'react'
// ---- Imports ----------------------------------------------------------------
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ResolvedTheme, ThemeChoice } from '../lib/theme-storage'
import { readSavedThemeChoice, resolveThemeChoice, saveThemeChoice } from '../lib/theme-storage'

// ---- Types ------------------------------------------------------------------

/** What useTheme() hands to components. */
type ThemeContextValue = {
  themeChoice: ThemeChoice
  resolvedTheme: ResolvedTheme
  setThemeChoice: (themeChoice: ThemeChoice) => void
}

type ThemeProviderProps = { children: ReactNode }

// ---- Context ----------------------------------------------------------------
const ThemeContext = createContext<ThemeContextValue | null>(null)

// ---- Provider ---------------------------------------------------------------

/**
 * Provides the theme to the whole application and applies it to <html>.
 * Must be mounted exactly once, above any component that calls useTheme().
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeChoice, setThemeChoiceState] = useState<ThemeChoice>(readSavedThemeChoice)
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  // Follow the operating system for as long as the choice stays `system`.
  // (The no-flash script cannot do this part — it only runs once.)
  useEffect(() => {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = (queryEvent: MediaQueryListEvent) =>
      setSystemPrefersDark(queryEvent.matches)
    darkModeQuery.addEventListener('change', handleSystemChange)
    return () => darkModeQuery.removeEventListener('change', handleSystemChange)
  }, [])

  const resolvedTheme = resolveThemeChoice(themeChoice, systemPrefersDark)

  // Keep <html> in sync: the class drives Tailwind's dark variant, and
  // color-scheme makes scrollbars and form controls match the theme.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setThemeChoice = useCallback((newThemeChoice: ThemeChoice) => {
    setThemeChoiceState(newThemeChoice)
    saveThemeChoice(newThemeChoice)
  }, [])

  const themeContextValue = useMemo(
    () => ({ themeChoice, resolvedTheme, setThemeChoice }),
    [themeChoice, resolvedTheme, setThemeChoice],
  )

  return <ThemeContext.Provider value={themeContextValue}>{children}</ThemeContext.Provider>
}

// ---- Hook -------------------------------------------------------------------

/**
 * Gives access to the current theme choice, the resolved theme, and the setter.
 * Throws when used outside ThemeProvider — that is always a bug, so fail fast.
 */
export function useTheme(): ThemeContextValue {
  const themeContext = useContext(ThemeContext)
  if (!themeContext) {
    throw new Error('useTheme must be used inside <ThemeProvider>')
  }
  return themeContext
}
