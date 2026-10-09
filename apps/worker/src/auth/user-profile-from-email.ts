// =============================================================================
// FILE:    apps/worker/src/auth/user-profile-from-email.ts
// PURPOSE: Derives a new user's display name and avatar color from their
//          email. Pure functions, so first sign-in is deterministic and
//          unit-testable without a database.
// USED BY: auth/current-user-resolver.ts
// =============================================================================

// ---- Constants --------------------------------------------------------------

/**
 * Avatar background colors, all chosen to keep white initials readable.
 * Assigned by hashing the email so each user keeps the same color forever.
 */
const AVATAR_COLOR_PALETTE = [
  '#0e7490',
  '#7c3aed',
  '#be185d',
  '#b45309',
  '#15803d',
  '#1d4ed8',
  '#a21caf',
  '#b91c1c',
  '#0f766e',
  '#4d7c0f',
] as const

/** Used if the palette lookup ever comes back empty (cannot happen today). */
const DEFAULT_AVATAR_COLOR: string = '#0e7490'

// ---- Pure functions ---------------------------------------------------------

/**
 * Builds a friendly display name from an email's local part:
 * "ada.lovelace@example.com" -> "Ada Lovelace". Separators (. _ -) and digit
 * suffixes become word boundaries. Falls back to the raw local part.
 * Returns the display name (at most 40 characters).
 */
export function deriveDisplayNameFromEmail(email: string): string {
  const emailLocalPart = email.split('@')[0] ?? email
  const nameWords = emailLocalPart
    .split(/[._-]+|\d+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())

  const derivedName = nameWords.join(' ')
  const isNameUsable = derivedName.length > 0
  return isNameUsable ? derivedName.slice(0, 40) : emailLocalPart.slice(0, 40)
}

/**
 * Picks a stable avatar color for an email by summing its character codes.
 * Returns a hex color string from AVATAR_COLOR_PALETTE.
 */
export function deriveAvatarColorFromEmail(email: string): string {
  const emailCharCodeSum = [...email].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return (
    AVATAR_COLOR_PALETTE[emailCharCodeSum % AVATAR_COLOR_PALETTE.length] ?? DEFAULT_AVATAR_COLOR
  )
}
