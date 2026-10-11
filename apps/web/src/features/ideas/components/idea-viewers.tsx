// =============================================================================
// FILE:    apps/web/src/features/ideas/components/idea-viewers.tsx
// PURPOSE: The "who is looking right now" indicator: overlapping avatars of
//          the teammates viewing an idea (or the board), with names on hover.
// USED BY: idea-card.tsx, idea-detail-drawer.tsx
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { WorkspaceViewer } from '@ideo/shared'
import { UserAvatar } from '../../../shared/components/ui/avatar'

// ---- Types ------------------------------------------------------------------
type IdeaViewersProps = {
  /** Viewers to show, already filtered (self excluded upstream). */
  viewers: WorkspaceViewer[]
}

// ---- Constants --------------------------------------------------------------

/** How many avatars to render before folding the rest into "+N". */
const VISIBLE_VIEWER_LIMIT = 3

// ---- Component --------------------------------------------------------------

/** Overlapping avatar stack; quiet and empty when nobody else is looking. */
export function IdeaViewers({ viewers }: IdeaViewersProps) {
  if (viewers.length === 0) return null

  const shownViewers = viewers.slice(0, VISIBLE_VIEWER_LIMIT)
  const hiddenViewerCount = viewers.length - shownViewers.length
  const viewerNames = viewers.map((viewer) => viewer.displayName).join(', ')

  return (
    <span
      className="flex items-center -space-x-1.5"
      title={`${viewerNames} ${viewers.length === 1 ? 'is' : 'are'} looking at this`}
    >
      {shownViewers.map((viewer) => (
        <UserAvatar
          key={viewer.userId}
          displayName={viewer.displayName}
          avatarColor={viewer.avatarColor}
          isOnline
          className="size-5 ring-2 ring-card"
        />
      ))}
      {hiddenViewerCount > 0 ? (
        <span className="font-mono text-xs text-muted">+{hiddenViewerCount}</span>
      ) : null}
    </span>
  )
}
