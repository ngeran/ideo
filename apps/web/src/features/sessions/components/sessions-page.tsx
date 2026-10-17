// =============================================================================
// FILE:    apps/web/src/features/sessions/components/sessions-page.tsx
// USAGE:   The brainstorm sessions page: a focused session panel (countdown,
//          spark composer with built-in prompts, spark list) plus the list of
//          every session. Live session events refresh it via the room.
// USED BY: app/application-router.tsx (route /sessions)
// =============================================================================

import type { BrainstormSessionResponse } from '@ideo/shared'
import { pickSparkPrompt } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { Link } from '@tanstack/react-router'
import { CalendarClock, Lightbulb, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { Input } from '../../../shared/components/ui/input'
import { Skeleton } from '../../../shared/components/ui/skeleton'
import { useSelectedWorkspace } from '../../workspaces/hooks/use-selected-workspace'
import { formatCountdown, useSessionCountdown } from '../hooks/use-session-countdown'
import { useSessionDetail } from '../hooks/use-session-detail'
import { useSessionList } from '../hooks/use-session-list'
import { useAddSessionSpark, useEndSession, useStartSession } from '../hooks/use-session-mutations'
import { CreateSessionDialog } from './create-session-dialog'

// ---- Types ------------------------------------------------------------------

/** One session as the list renders it. */
type SessionListRow = BrainstormSessionResponse

// ---- Section components -----------------------------------------------------

/** A session's lifecycle state in words and color. */
function SessionStatusBadge({ sessionRow }: { sessionRow: SessionListRow }) {
  const label =
    sessionRow.endedAt !== null ? 'Ended' : sessionRow.startedAt !== null ? 'Running' : 'Scheduled'
  const badgeClasses =
    sessionRow.endedAt !== null
      ? 'bg-sunken text-muted'
      : sessionRow.startedAt !== null
        ? 'bg-accent/10 text-accent'
        : 'bg-warning/10 text-warning'
  return (
    <span
      className={`inline-flex rounded-control px-2 py-0.5 font-mono text-xs font-medium ${badgeClasses}`}
    >
      {label}
    </span>
  )
}

/** The focused session: countdown, spark composer, and the spark list. */
function SessionPanel({ sessionId }: { sessionId: string }) {
  const sessionDetailQuery = useSessionDetail(sessionId)
  const [sparkText, setSparkText] = useState('')

  const addSpark = useAddSessionSpark(sessionId, () => setSparkText(''))
  const startSession = useStartSession(sessionId)
  const endSession = useEndSession(sessionId)

  // The countdown hook stays above any early return (rules of hooks); it
  // reads nullable placeholders until the detail has loaded.
  const loadedSession = sessionDetailQuery.data?.session
  const countdown = useSessionCountdown(
    loadedSession?.startedAt ?? null,
    loadedSession?.durationSeconds ?? 600,
    loadedSession?.endedAt ?? null,
  )

  if (sessionDetailQuery.isPending) {
    return <Skeleton className="h-64 w-full" />
  }
  if (sessionDetailQuery.isError || sessionDetailQuery.data === undefined) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Session unavailable"
        description="It may have been deleted, or you may not be a member of its workspace."
      />
    )
  }

  const { session, sparks } = sessionDetailQuery.data

  async function handleSparkSubmit() {
    await addSpark.mutateAsync({ sparkText })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {session.topic}
            <SessionStatusBadge sessionRow={session} />
            {session.isAnonymousUntilEnd && session.endedAt === null ? (
              <span className="font-mono text-xs text-muted">anonymous</span>
            ) : null}
          </span>
          <span className="flex items-center gap-2">
            {countdown.isRunning ? (
              <span className="font-mono text-lg text-accent">
                <span className="sr-only">Time remaining: </span>
                {formatCountdown(countdown.secondsLeft ?? 0)}
              </span>
            ) : null}
            {session.startedAt === null ? (
              <Button
                size="sm"
                onClick={() => startSession.mutate()}
                isLoading={startSession.isPending}
              >
                Start session
              </Button>
            ) : null}
            {countdown.isFinished ? (
              <span className="font-mono text-xs text-muted">Time's up — wrap up</span>
            ) : null}
            {session.startedAt !== null && session.endedAt === null ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => endSession.mutate()}
                isLoading={endSession.isPending}
              >
                End session
              </Button>
            ) : null}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {session.startedAt !== null && session.endedAt === null ? (
          <form
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault()
              void handleSparkSubmit()
            }}
            className="flex flex-col gap-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={sparkText}
                onChange={(changeEvent) => setSparkText(changeEvent.target.value)}
                placeholder="Add a spark…"
                aria-label="Spark text"
                maxLength={120}
                className="min-w-48 flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setSparkText(pickSparkPrompt())}
              >
                <Lightbulb aria-hidden /> Spark an idea
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={addSpark.isPending}
                disabled={sparkText.trim().length === 0}
              >
                Add spark
              </Button>
            </div>
            {session.isAnonymousUntilEnd ? (
              <p className="text-xs text-muted">
                Sparks are anonymous — authors are revealed when the timer ends.
              </p>
            ) : null}
          </form>
        ) : null}

        {sparks.length === 0 ? (
          <p className="text-sm text-muted">
            No sparks yet — start the timer and throw the first one in.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sparks.map((sparkIdea) => (
              <li
                key={sparkIdea.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle pb-2 text-sm last:border-b-0"
              >
                <span className="font-medium text-primary">{sparkIdea.title}</span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className="font-mono">{sparkIdea.voteCount} votes</span>
                  {sparkIdea.author !== null ? (
                    <span>{sparkIdea.author.displayName}</span>
                  ) : (
                    <span className="italic">anonymous</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

// ---- Component --------------------------------------------------------------

/** The brainstorm sessions page at /sessions. */
export function SessionsPage() {
  const { selectedWorkspaceId, workspaces } = useSelectedWorkspace()
  const sessionListQuery = useSessionList(selectedWorkspaceId)
  const workspaceSessions = sessionListQuery.data?.pages.flatMap((page) => page.sessions) ?? []

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null)

  // The newest running (or scheduled) session is the natural focus.
  const defaultFocusedSessionId = focusedSessionId ?? workspaceSessions[0]?.id ?? null

  const hasNoWorkspaceAtAll = selectedWorkspaceId === null && workspaces.length === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-primary">Brainstorm sessions</h1>
        <Button
          size="sm"
          onClick={() => setIsCreateDialogOpen(true)}
          disabled={selectedWorkspaceId === null}
        >
          <Plus aria-hidden /> New session
        </Button>
      </div>

      {hasNoWorkspaceAtAll ? (
        <EmptyState
          icon={CalendarClock}
          title="No workspace yet"
          description="Create or join a workspace first — sessions live inside one."
          action={
            <Button renderAsChild>
              <Link to="/">Back to overview</Link>
            </Button>
          }
        />
      ) : sessionListQuery.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : sessionListQuery.isError ? (
        <EmptyState
          icon={CalendarClock}
          title="Sessions could not load"
          description="Check your connection and try again."
          action={
            <Button variant="secondary" onClick={() => void sessionListQuery.refetch()}>
              Try again
            </Button>
          }
        />
      ) : workspaceSessions.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No sessions yet"
          description="Schedule a short, timeboxed burst — sparks become ideas on the board."
          action={
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus aria-hidden /> New session
            </Button>
          }
        />
      ) : (
        <>
          {defaultFocusedSessionId !== null ? (
            <SessionPanel sessionId={defaultFocusedSessionId} />
          ) : null}

          <section className="flex flex-col gap-2">
            <p className="font-mono text-xs text-muted">ALL SESSIONS</p>
            <ul className="flex flex-col gap-2">
              {workspaceSessions.map((sessionRow) => (
                <li key={sessionRow.id}>
                  <button
                    type="button"
                    onClick={() => setFocusedSessionId(sessionRow.id)}
                    className={
                      'flex w-full flex-wrap items-center justify-between gap-2 rounded-control border px-3 py-2 text-left text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
                      (sessionRow.id === defaultFocusedSessionId
                        ? 'border-accent/40 bg-accent/5'
                        : 'border-subtle hover:bg-sunken')
                    }
                  >
                    <span className="flex items-center gap-2">
                      <SessionStatusBadge sessionRow={sessionRow} />
                      <span className="font-medium text-primary">{sessionRow.topic}</span>
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {sessionRow.sparkCount} sparks · by {sessionRow.createdBy.displayName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {selectedWorkspaceId !== null ? (
        <CreateSessionDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          workspaceId={selectedWorkspaceId}
          onSessionCreated={(createdSessionId) => {
            setFocusedSessionId(createdSessionId)
          }}
        />
      ) : null}
    </div>
  )
}
