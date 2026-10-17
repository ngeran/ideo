// =============================================================================
// FILE:    apps/web/src/features/sessions/hooks/use-session-countdown.ts
// PURPOSE: The session countdown, computed locally from the server-fixed
//          start time and duration — exactly one interval, and only while
//          the session is running (the server never ticks per second).
// USED BY: sessions-page.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'

// ---- Types ------------------------------------------------------------------

/** The countdown state for one session. */
export type SessionCountdown = {
  /** Seconds remaining while running; null before start; 0 after. */
  secondsLeft: number | null
  isRunning: boolean
  isFinished: boolean
}

// ---- Hooks ------------------------------------------------------------------

/**
 * Derives the countdown from startedAt + durationSeconds, ticking once per
 * second only while the timer is live (a server-set endedAt always wins).
 */
export function useSessionCountdown(
  startedAt: string | null,
  durationSeconds: number,
  endedAt: string | null,
): SessionCountdown {
  const [nowMs, setNowMs] = useState(() => Date.now())

  const endsAtMs = useMemo(
    () => (startedAt === null ? null : new Date(startedAt).getTime() + durationSeconds * 1000),
    [startedAt, durationSeconds],
  )

  useEffect(() => {
    if (endsAtMs === null || endedAt !== null) return
    const countdownInterval = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(countdownInterval)
  }, [endsAtMs, endedAt])

  if (endedAt !== null) {
    return { secondsLeft: 0, isRunning: false, isFinished: true }
  }
  if (endsAtMs === null) {
    return { secondsLeft: null, isRunning: false, isFinished: false }
  }

  const secondsLeft = Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000))
  return {
    secondsLeft,
    isRunning: secondsLeft > 0,
    isFinished: secondsLeft === 0,
  }
}

/** Renders seconds as m:ss for the countdown display. */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
