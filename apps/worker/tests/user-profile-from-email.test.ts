// =============================================================================
// FILE:    apps/worker/tests/user-profile-from-email.test.ts
// PURPOSE: Unit tests for the pure functions that build a new user's profile
//          from their email, so first sign-in stays deterministic.
// USED BY: `pnpm test`
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { describe, expect, it } from 'vitest'
import {
  deriveAvatarColorFromEmail,
  deriveDisplayNameFromEmail,
} from '../src/auth/user-profile-from-email'

// ---- Tests ------------------------------------------------------------------
describe('deriveDisplayNameFromEmail', () => {
  it('splits separator-separated local parts into capitalized words', () => {
    expect(deriveDisplayNameFromEmail('ada.lovelace@example.com')).toBe('Ada Lovelace')
  })

  it('treats digits as word boundaries', () => {
    expect(deriveDisplayNameFromEmail('maria2go@example.com')).toBe('Maria Go')
  })

  it('falls back to the raw local part when nothing readable remains', () => {
    expect(deriveDisplayNameFromEmail('___@example.com')).toBe('___')
  })
})

describe('deriveAvatarColorFromEmail', () => {
  it('returns the same color for the same email', () => {
    expect(deriveAvatarColorFromEmail('ada@example.com')).toBe(
      deriveAvatarColorFromEmail('ada@example.com'),
    )
  })

  it('returns a valid hex color', () => {
    const derivedColor = deriveAvatarColorFromEmail('grace@example.com')
    expect(derivedColor).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
