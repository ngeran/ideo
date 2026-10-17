// =============================================================================
// FILE:    apps/worker/src/services/activity-service.ts
// PURPOSE: The activity feed's read rules: a member sees their workspace's
//          events, newest first, one page at a time. Events are written by
//          every mutation, so this service only gates and shapes.
// USED BY: routes/activity-routes.ts
// =============================================================================

import type { ActivityListResponse } from '@ideo/shared'
import { activityListResponseSchema } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import type { UserRecord } from '../configuration/record-types'
import { listActivityForWorkspace } from '../database/activity-event-queries'
import type { IdeoDatabase } from '../database/create-database'
import { findWorkspaceMember } from '../database/workspace-member-queries'
import { workspaceAccessDeniedError } from '../routes/api-errors'

// ---- Services ---------------------------------------------------------------

/** Lists one page of the workspace's activity feed for a member. */
export async function listActivityForMember(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  workspaceId: string,
  listQuery: { cursor?: string | undefined; limit: number },
): Promise<ActivityListResponse> {
  const membership = await findWorkspaceMember(database, workspaceId, requestingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const listPage = await listActivityForWorkspace(database, workspaceId, {
    cursor: listQuery.cursor,
    limit: listQuery.limit,
  })

  return activityListResponseSchema.parse({
    events: listPage.rows.map((eventRow) => ({
      id: eventRow.id,
      actor: {
        userId: eventRow.actorUserId,
        displayName: eventRow.actorDisplayName,
        avatarColor: eventRow.actorAvatarColor,
      },
      eventType: eventRow.eventType,
      subjectType: eventRow.subjectType,
      subjectId: eventRow.subjectId,
      summaryText: eventRow.summaryText,
      createdAt: eventRow.createdAt,
    })),
    nextCursor: listPage.nextCursor,
  })
}
