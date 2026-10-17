// =============================================================================
// FILE:    apps/web/src/features/sessions/components/create-session-dialog.tsx
// PURPOSE: Dialog for scheduling a brainstorm session: topic, duration
//          (short bursts, default 10 minutes), and the anonymity toggle.
// USED BY: sessions-page.tsx
// =============================================================================

import { BRAINSTORM_DURATION_DEFAULT, ENTITY_LIMITS } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '../../../shared/components/ui/dialog'
import { Input } from '../../../shared/components/ui/input'
import { useCreateSession } from '../hooks/use-session-mutations'

// ---- Types ------------------------------------------------------------------
export type CreateSessionDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  workspaceId: string
  /** Called with the new session's id after a successful creation. */
  onSessionCreated: (sessionId: string) => void
}

// ---- Constants --------------------------------------------------------------

/** The duration choices, in minutes (the API speaks seconds). */
const DURATION_CHOICES = [5, 10, 15, 20] as const

// ---- Component --------------------------------------------------------------

/** Modal form that schedules a brainstorm session. */
export function CreateSessionDialog({
  isOpen,
  onOpenChange,
  workspaceId,
  onSessionCreated,
}: CreateSessionDialogProps) {
  const [sessionTopic, setSessionTopic] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<number>(BRAINSTORM_DURATION_DEFAULT / 60)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const createSession = useCreateSession(onSessionCreated)

  function resetAndClose() {
    onOpenChange(false)
    setSessionTopic('')
    setDurationMinutes(BRAINSTORM_DURATION_DEFAULT / 60)
    setIsAnonymous(true)
  }

  async function handleCreateClick() {
    await createSession.mutateAsync({
      workspaceId,
      sessionRequest: {
        topic: sessionTopic,
        durationSeconds: durationMinutes * 60,
        isAnonymousUntilEnd: isAnonymous,
      },
    })
    resetAndClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>New brainstorm session</DialogTitle>
        <DialogDescription>
          A short, timeboxed burst — everyone adds sparks until the timer ends.
        </DialogDescription>
        <form
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault()
            void handleCreateClick()
          }}
          className="flex flex-col gap-4"
        >
          <Input
            value={sessionTopic}
            onChange={(changeEvent) => setSessionTopic(changeEvent.target.value)}
            placeholder="e.g. Launch week ideas"
            aria-label="Session topic"
            maxLength={ENTITY_LIMITS.brainstormTopic}
            autoFocus
          />

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-primary">Duration</span>
            <select
              value={durationMinutes}
              onChange={(changeEvent) => setDurationMinutes(Number(changeEvent.target.value))}
              aria-label="Session duration"
              className="h-9 rounded-control border border-subtle bg-card px-2 text-sm text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              {DURATION_CHOICES.map((choiceMinutes) => (
                <option key={choiceMinutes} value={choiceMinutes}>
                  {choiceMinutes} minutes
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(changeEvent) => setIsAnonymous(changeEvent.target.checked)}
              className="size-4 accent-[var(--accent)]"
            />
            <span className="text-primary">
              Anonymous until the end{' '}
              <span className="text-muted">— authors are revealed when the timer stops</span>
            </span>
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createSession.isPending}
              disabled={sessionTopic.trim().length === 0}
            >
              Create session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
