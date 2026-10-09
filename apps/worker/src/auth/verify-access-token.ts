// =============================================================================
// FILE:    apps/worker/src/auth/verify-access-token.ts
// PURPOSE: Verifies a Cloudflare Access JWT (Cf-Access-Jwt-Assertion): checks
//          the signature against the team's public keys (JWKS), the issuer,
//          the audience (AUD tag), and expiry. The email header alone is never
//          trusted — that header is client-controlled.
// USED BY: auth/current-user-resolver.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { createRemoteJWKSet, jwtVerify } from 'jose'

// ---- Types ------------------------------------------------------------------

/** The claims the Worker relies on from a verified Access JWT. */
export type VerifiedAccessIdentity = {
  userEmail: string
}

// ---- Constants --------------------------------------------------------------

/** JWKS are small and stable; cache them for the isolate's lifetime. */
const JWKS_CACHE_MAX_AGE_MS = 10 * 60 * 1000

// ---- Pure functions ---------------------------------------------------------

/**
 * Verifies a Cloudflare Access JWT against the team's public keys.
 * Returns the verified email. Throws when the token is missing, signed by
 * another team, expired, or issued for a different application (AUD).
 */
export async function verifyAccessToken(
  accessToken: string,
  accessTeamDomain: string,
  accessAudienceTag: string,
): Promise<VerifiedAccessIdentity> {
  const teamPublicKeySet = createRemoteJWKSet(new URL(`https://${accessTeamDomain}/cdn-cgi/access/certs`), {
    cooldownDuration: JWKS_CACHE_MAX_AGE_MS,
  })

  const { payload } = await jwtVerify(accessToken, teamPublicKeySet, {
    issuer: `https://${accessTeamDomain}/access`,
    audience: accessAudienceTag,
  })

  const verifiedEmail = typeof payload.email === 'string' ? payload.email : undefined
  const hasVerifiedEmail = typeof verifiedEmail === 'string' && verifiedEmail.length > 0
  if (!hasVerifiedEmail) {
    throw new Error('Access token carries no email claim')
  }

  return { userEmail: verifiedEmail }
}
