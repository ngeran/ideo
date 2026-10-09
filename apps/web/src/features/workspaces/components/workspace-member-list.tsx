// =============================================================================
// FILE:    apps/web/src/features/workspaces/components/workspace-member-list.tsx
// PURPOSE: The people in this workspace: avatar, name, role badge. Rendered
//          from the workspace detail query.
// USED BY: workspace-page.tsx (workspace page and, later, the settings card)
// =============================================================================

import type { WorkspaceMemberResponse } from '@ideo/shared'
import { UserAvatar } from '../../../shared/components/ui/avatar'
// ---- Imports ----------------------------------------------------------------
import { Badge } from '../../../shared/components/ui/badge'

// ---- Types ------------------------------------------------------------------
export type WorkspaceMemberListProps = {
  members: ReadonlyArray<WorkspaceMemberResponse>
}

// ---- Component --------------------------------------------------------------

/** Accessible list of members with owner badges. */
export function WorkspaceMemberList({ members }: WorkspaceMemberListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {members.map((member) => (
        <li key={member.userId} className="flex items-center gap-3">
          <UserAvatar displayName={member.displayName} avatarColor={member.avatarColor} />
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">
            {member.displayName}
          </span>
          {member.memberRole === 'owner' ? (
            <Badge variant="accent">Owner</Badge>
          ) : (
            <Badge variant="outline">Member</Badge>
          )}
        </li>
      ))}
    </ul>
  )
}
