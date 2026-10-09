// =============================================================================
// FILE:    apps/web/src/shared/components/ui/avatar.tsx
// PURPOSE: Person avatar with an initials fallback, colored by each user's
//          stable avatar_color. Used for presence, votes, comments, assignees.
// USED BY: app shell (presence strip), ideas, tasks, comments
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import type { ComponentProps } from 'react'
import { mergeComponentClasses } from '../../lib/merge-component-classes'

// ---- Types ------------------------------------------------------------------
export type UserAvatarProps = ComponentProps<typeof AvatarPrimitive.Root> & {
  displayName: string
  /** Per-user accent color (from users.avatar_color) used for the initials. */
  avatarColor: string
  /** Render a ring when the user is online. */
  isOnline?: boolean
}

// ---- Component helpers ------------------------------------------------------

/**
 * Derives the up-to-two leading initials from a display name
 * (e.g. "Ada Lovelace" -> "AL", "Nikos" -> "N").
 * Returns the initials uppercased.
 */
function deriveInitials(displayName: string): string {
  const nameParts = displayName.trim().split(/\s+/).slice(0, 2)
  return nameParts
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join('')
}

// ---- Component --------------------------------------------------------------

/**
 * Round avatar showing the user's initials on their color.
 * Sizes via className (e.g. `size-8`); adds a teal ring when online.
 */
export function UserAvatar({ displayName, avatarColor, isOnline = false, className, ...avatarProps }: UserAvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={mergeComponentClasses(
        'relative inline-flex size-8 shrink-0 overflow-hidden rounded-full',
        isOnline && 'ring-2 ring-accent ring-offset-2 ring-offset-page',
        className,
      )}
      {...avatarProps}
    >
      {/* No images exist yet (Phase 1+ has no uploads); initials carry the load. */}
      <AvatarPrimitive.Fallback
        style={{ backgroundColor: avatarColor, color: '#ffffff' }}
        className="flex size-full items-center justify-center text-xs font-semibold"
        aria-label={displayName}
        delayMs={0}
      >
        {deriveInitials(displayName)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
