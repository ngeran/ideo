// =============================================================================
// FILE:    apps/worker/tests/health-endpoint.test.ts
// PURPOSE: Smoke test proving the Worker boots in real workerd and serves the
//          API. This is the template for all endpoint tests that follow.
// USED BY: `pnpm test`
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

// ---- Tests ------------------------------------------------------------------
describe('GET /api/health', () => {
  it('responds with 200 and an ok status', async () => {
    const response = await SELF.fetch('https://ideo.test/api/health')

    expect(response.status).toBe(200)

    const responseBody = (await response.json()) as { status: string; service: string }
    expect(responseBody.status).toBe('ok')
    expect(responseBody.service).toBe('ideo-api')
  })
})
