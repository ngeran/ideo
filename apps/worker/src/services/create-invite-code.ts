// =============================================================================
// FILE:    apps/worker/src/services/create-invite-code.ts
// PURPOSE: Generates invite codes: 12 characters from an unambiguous alphabet
//          (no 0/O/1/I/L), random via the Workers crypto API. Codes are shown
//          and typed by humans, so readability matters as much as entropy.
// USED BY: services/invite-service.ts
// =============================================================================

// ---- Constants --------------------------------------------------------------

/** Alphabet without lookalike characters (0/O, 1/I/L are excluded). */
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** 31-letter alphabet, 12 characters: ~62 bits of entropy. */
export const INVITE_CODE_LENGTH = 12

// ---- Pure functions ---------------------------------------------------------

/**
 * Generates a fresh invite code.
 * Returns 12 uppercase characters from the unambiguous alphabet.
 */
export function createInviteCode(): string {
  const randomValues = crypto.getRandomValues(new Uint32Array(INVITE_CODE_LENGTH))
  return Array.from(randomValues, (randomValue) => INVITE_CODE_ALPHABET[randomValue % INVITE_CODE_ALPHABET.length]).join(
    '',
  )
}
