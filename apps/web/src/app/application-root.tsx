// =============================================================================
// FILE:    apps/web/src/app/application-root.tsx
// PURPOSE: Top-level React component for the Phase 1 skeleton. Renders a page
//          that pings the Worker's health endpoint, proving the dev proxy and
//          deploy wiring end to end. Replaced by the app shell in Phase 2.
// USED BY: apps/web/src/main.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useEffect, useState } from 'react'

// ---- Types ------------------------------------------------------------------

/** Shape of the Worker's GET /api/health response body. */
type HealthResponse = {
  status: string
  service: string
  timestamp: string
}

// ---- Component --------------------------------------------------------------
export function ApplicationRoot() {
  const [healthState, setHealthState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    let isComponentStillMounted = true

    async function checkWorkerHealth() {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) throw new Error(`Health check failed with ${response.status}`)

        const healthResponse = (await response.json()) as HealthResponse
        if (!isComponentStillMounted) return
        setHealthState(healthResponse.status === 'ok' ? 'ok' : 'error')
      } catch {
        if (isComponentStillMounted) setHealthState('error')
      }
    }

    void checkWorkerHealth()
    return () => {
      isComponentStillMounted = false
    }
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', margin: '4rem auto', maxWidth: '36rem' }}>
      <h1>Ideo</h1>
      <p>Phase 1 skeleton: monorepo, Worker, and web app wired together.</p>
      <p>
        Worker health check:{' '}
        <strong>
          {healthState === 'loading' && 'checking…'}
          {healthState === 'ok' && 'ok — the API answered ✅'}
          {healthState === 'error' && 'unreachable — is `wrangler dev` running?'}
        </strong>
      </p>
    </main>
  )
}
