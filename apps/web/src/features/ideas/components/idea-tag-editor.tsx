// =============================================================================
// FILE:    apps/web/src/features/ideas/components/idea-tag-editor.tsx
// PURPOSE: Shows an idea's tags and edits them as comma-separated text. The
//          save button only appears when the text differs from the idea's
//          tags, and tags replace the old set (matching the update API).
// USED BY: idea-detail-drawer.tsx
// =============================================================================

import { ENTITY_LIMITS } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { useEffect, useState } from 'react'
import { Badge } from '../../../shared/components/ui/badge'
import { Button } from '../../../shared/components/ui/button'
import { Input } from '../../../shared/components/ui/input'
import { useUpdateIdea } from '../hooks/use-idea-mutations'

// ---- Types ------------------------------------------------------------------
type IdeaTagEditorProps = {
  ideaId: string
  tags: string[]
}

// ---- Internal helpers -------------------------------------------------------

/**
 * Turns the raw tags text into the request's tag list: split on commas,
 * trimmed, lowercased, deduplicated, and capped at the shared limit — the
 * same rules the server schema applies.
 */
function parseTagsText(tagsText: string): string[] {
  const parsedTags = tagsText
    .split(',')
    .map((rawTag) => rawTag.trim().toLowerCase())
    .filter((parsedTag) => parsedTag.length > 0)
  return [...new Set(parsedTags)].slice(0, ENTITY_LIMITS.ideaTagsPerIdea)
}

/** Joins tags back into editable comma-separated text. */
function formatTagsText(tags: string[]): string {
  return tags.join(', ')
}

// ---- Component --------------------------------------------------------------

/** The idea's tags with an inline editor; saving replaces the whole set. */
export function IdeaTagEditor({ ideaId, tags }: IdeaTagEditorProps) {
  const updateIdea = useUpdateIdea()
  const [tagsText, setTagsText] = useState(formatTagsText(tags))

  // Follow the server when the idea's tags change elsewhere (another save).
  useEffect(() => {
    setTagsText(formatTagsText(tags))
  }, [tags])

  // Both sides are sorted so only real set differences count as unsaved.
  const hasUnsavedTagChanges =
    parseTagsText(tagsText).sort().join('|') !== [...tags].sort().join('|')

  function saveTags() {
    updateIdea.mutate({ ideaId, updateFields: { tags: parseTagsText(tagsText) } })
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tagLabel) => (
            <Badge key={tagLabel} className="font-mono">
              {tagLabel}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No tags yet.</p>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={tagsText}
          onChange={(changeEvent) => setTagsText(changeEvent.target.value)}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key === 'Enter' && hasUnsavedTagChanges) {
              keyEvent.preventDefault()
              saveTags()
            }
          }}
          placeholder="e.g. growth, onboarding"
          aria-label="Tags, separated by commas"
          maxLength={ENTITY_LIMITS.ideaTag * (ENTITY_LIMITS.ideaTagsPerIdea + 1)}
          className="font-mono"
        />
        {hasUnsavedTagChanges ? (
          <Button size="sm" variant="secondary" onClick={saveTags} isLoading={updateIdea.isPending}>
            Save tags
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        Comma-separated, up to {ENTITY_LIMITS.ideaTagsPerIdea}. Saving replaces all tags.
      </p>
    </div>
  )
}
