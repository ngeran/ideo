// =============================================================================
// FILE:    apps/web/src/shared/lib/theme-storage.ts
// PURPOSE: Reading and writing the per-device theme choice. Kept separate from
//          the provider so the no-flash inline script in index.html has an
//          obvious counterpart to stay in sync with.
// USED BY: shared/hooks/use-theme.tsx, index.html (inline copy of this logic)
// =============================================================================

// ---- Constants --------------------------------------------------------------

/**
 * localStorage key for the theme choice. The inline no-flash script in
 * index.html reads the same key — change both together.
 */
export const THEME_STORAGE_KEY = 'ideo-theme'

// ---- Types ------------------------------------------------------------------

/** What the user picked: a fixed theme, or follow the operating system. */
export type ThemeChoice = 'light' | 'dark' | 'system'

/** The theme actually painted after resolving `system`. */
export type ResolvedTheme = 'light' | 'dark'

// ---- Constants --------------------------------------------------------------
export const THEME_CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system']
const DEFAULT_THEME_CHOICE: ThemeChoice = 'system'

// ---- Persistence helpers ----------------------------------------------------

/**
 * Reads the saved theme choice from localStorage.
 * Returns the choice, falling back to `system` when nothing (or something
 * invalid) is saved — private-browsing modes can throw, hence try/catch.
 */
export function readSavedThemeChoice(): ThemeChoice {
  try {
    const savedChoice = localStorage.getItem(THEME_STORAGE_KEY)
    const isKnownChoice = THEME_CHOICES.includes(savedChoice as ThemeChoice)
    return isKnownChoice ? (savedChoice as ThemeChoice) : DEFAULT_THEME_CHOICE
  } catch {
    return DEFAULT_THEME_CHOICE
  }
}

/**
 * Persists the theme choice to localStorage.
 * Swallows storage failures (private browsing) on purpose: the theme still
 * works for this session even when it cannot be remembered.
 */
export function saveThemeChoice(themeChoice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeChoice)
  } catch {
    // Remembering is best-effort; never surface a storage error for a theme.
  }
}

/**
 * Resolves a theme choice to the theme that should be painted.
 * Returns 'dark' or 'light' based on the choice and the system preference.
 */
export function resolveThemeChoice(
  themeChoice: ThemeChoice,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (themeChoice === 'system') return systemPrefersDark ? 'dark' : 'light'
  return themeChoice
}
