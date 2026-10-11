// =============================================================================
// FILE:    apps/web/src/features/ideas/components/create-idea-dialog.tsx
// PURPOSE: Dialog for capturing a new idea: title, optional description, and
//          optional comma-separated tags. New ideas start in the spark stage.
// USED BY: idea-board-page.tsx
// =============================================================================

import { ENTITY_LIMITS } from '@ideo/shared'
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
import { Textarea } from '../../../shared/components/ui/textarea'
import { useCreateIdea } from '../hooks/use-idea-mutations'

// ---- Types ------------------------------------------------------------------
export type CreateIdeaDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  workspaceId: string
  /** Called with the new idea's id after a successful creation. */
  onIdeaCreated: (ideaId: string) => void
}

// ---- Internal helpers -------------------------------------------------------

/**
 * Turns the raw tags text into the request's tag list: split on commas,
 * trimmed, lowercased, deduplicated, and capped at the shared limit. The
 * server schema applies the same rules, so this is a preview, not the law.
 */
function parseTagsText(tagsText: string): string[] {
  const parsedTags = tagsText
    .split(',')
    .map((rawTag) => rawTag.trim().toLowerCase())
    .filter((parsedTag) => parsedTag.length > 0)
  return [...new Set(parsedTags)].slice(0, ENTITY_LIMITS.ideaTagsPerIdea)
}

// ---- Component --------------------------------------------------------------

/** Modal form that adds an idea to the board. */
export function CreateIdeaDialog({
  isOpen,
  onOpenChange,
  workspaceId,
  onIdeaCreated,
}: CreateIdeaDialogProps) {
  const [ideaTitle, setIdeaTitle] = useState('')
  const [ideaDescription, setIdeaDescription] = useState('')
  const [tagsText, setTagsText] = useState('')
  const createIdea = useCreateIdea(workspaceId, onIdeaCreated)

  /** The tags as they will actually be sent, shown live under the input. */
  const parsedTags = parseTagsText(tagsText)

  function resetAndClose() {
    onOpenChange(false)
    setIdeaTitle('')
    setIdeaDescription('')
    setTagsText('')
  }

  async function handleCreateClick() {
    await createIdea.mutateAsync({
      title: ideaTitle,
      description: ideaDescription,
      tags: parsedTags,
    })
    resetAndClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Add an idea</DialogTitle>
        <DialogDescription>
          Capture the spark — a title is enough to start. New ideas begin in the Spark stage.
        </DialogDescription>
        <form
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault()
            void handleCreateClick()
          }}
          className="flex flex-col gap-4"
        >
          <Input
            value={ideaTitle}
            onChange={(changeEvent) => setIdeaTitle(changeEvent.target.value)}
            placeholder="e.g. Weekly demo day"
            aria-label="Idea title"
            maxLength={ENTITY_LIMITS.ideaTitle}
            autoFocus
          />
          <Textarea
            value={ideaDescription}
            onChange={(changeEvent) => setIdeaDescription(changeEvent.target.value)}
            placeholder="What is the idea? Why might it matter? (optional)"
            aria-label="Idea description"
            maxLength={ENTITY_LIMITS.ideaDescription}
            rows={4}
          />
          <div className="flex flex-col gap-1.5">
            <Input
              value={tagsText}
              onChange={(changeEvent) => setTagsText(changeEvent.target.value)}
              placeholder="e.g. growth, onboarding"
              aria-label="Tags, separated by commas"
              className="font-mono"
            />
            {parsedTags.length > 0 ? (
              <p className="font-mono text-xs text-muted">
                {parsedTags.length}/{ENTITY_LIMITS.ideaTagsPerIdea} tags: {parsedTags.join(', ')}
              </p>
            ) : (
              <p className="text-xs text-muted">Tags are optional — separate them with commas.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createIdea.isPending}
              disabled={ideaTitle.trim().length === 0}
            >
              Add idea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
