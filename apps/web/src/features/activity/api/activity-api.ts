// =============================================================================
// FILE:    apps/web/src/features/activity/api/activity-api.ts
// PURPOSE: The activity feed API call the web app makes. Parses responses
//          with the shared schemas via the api client.
// USED BY: features/activity/hooks/use-activity-list.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type { ActivityListResponse } from '@ideo/shared'
import { activityListResponseSchema } from '@ideo/shared'
import { requestFromApi } from '../../../shared/lib/api-client'

// ---- Types ------------------------------------------------------------------

/** Paging for the activity listing. */
export type ActivityListParameters = {
  cursor?: string | undefined
  limit?: number
}

// ---- Requests ---------------------------------------------------------------

/** Fetches one page of the workspace's activity, newest first. */
export function fetchActivityList(
  workspaceId: string,
  listParameters: ActivityListParameters,
): Promise<ActivityListResponse> {
  const searchParameters = new URLSearchParams()
  if (listParameters.cursor !== undefined) searchParameters.set('cursor', listParameters.cursor)
  if (listParameters.limit !== undefined)
    searchParameters.set('limit', String(listParameters.limit))
  const queryString = searchParameters.toString()
  return requestFromApi(
    `/api/workspaces/${workspaceId}/activity${queryString ? `?${queryString}` : ''}`,
    { method: 'GET', responseSchema: activityListResponseSchema },
  )
}
