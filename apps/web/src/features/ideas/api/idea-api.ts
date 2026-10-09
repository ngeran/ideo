// =============================================================================
// FILE:    apps/web/src/features/ideas/api/idea-api.ts
// PURPOSE: Every idea API call the web app makes: list, create, read detail,
//          update, vote toggle, and comment. Parses responses with the shared
//          schemas via the api client.
// USED BY: features/ideas/hooks/*.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type {
  CreateIdeaCommentRequest,
  CreateIdeaRequest,
  IdeaCreatedResponse,
  IdeaDetailResponse,
  IdeaListResponse,
  UpdateIdeaRequest,
} from '@ideo/shared'
import {
  createIdeaCommentRequestSchema,
  createIdeaRequestSchema,
  ideaCommentCreatedResponseSchema,
  ideaCreatedResponseSchema,
  ideaDetailResponseSchema,
  ideaListResponseSchema,
  ideaUpdatedResponseSchema,
  ideaVoteToggledResponseSchema,
} from '@ideo/shared'
import { requestFromApi } from '../../../shared/lib/api-client'

// ---- Types ------------------------------------------------------------------

/** Filters and paging for the board listing. */
export type IdeaListParameters = {
  stage?: string | undefined
  sort: string
  cursor?: string | undefined
  limit?: number
}

// ---- Requests ---------------------------------------------------------------

/** Fetches one page of the board for a workspace. */
export function fetchIdeaList(workspaceId: string, listParameters: IdeaListParameters): Promise<IdeaListResponse> {
  const searchParameters = new URLSearchParams({ sort: listParameters.sort })
  if (listParameters.stage !== undefined) searchParameters.set('stage', listParameters.stage)
  if (listParameters.cursor !== undefined) searchParameters.set('cursor', listParameters.cursor)
  if (listParameters.limit !== undefined) searchParameters.set('limit', String(listParameters.limit))

  return requestFromApi(`/api/workspaces/${workspaceId}/ideas?${searchParameters.toString()}`, {
    method: 'GET',
    responseSchema: ideaListResponseSchema,
  })
}

/** Fetches one idea with its comments (for the drawer). */
export function fetchIdeaDetail(ideaId: string): Promise<IdeaDetailResponse> {
  return requestFromApi(`/api/ideas/${ideaId}`, { method: 'GET', responseSchema: ideaDetailResponseSchema })
}

/** Creates an idea in a workspace (it starts in the spark stage). */
export function createIdeaRequest(
  workspaceId: string,
  requestBody: CreateIdeaRequest,
): Promise<IdeaCreatedResponse> {
  createIdeaRequestSchema.parse(requestBody) // fail fast in the form
  return requestFromApi(`/api/workspaces/${workspaceId}/ideas`, {
    method: 'POST',
    requestBody,
    responseSchema: ideaCreatedResponseSchema,
  })
}

/** Updates an idea's fields, scores, or tags (tags replace the old ones). */
export function updateIdeaRequest(ideaId: string, requestBody: UpdateIdeaRequest): Promise<void> {
  return requestFromApi(`/api/ideas/${ideaId}`, {
    method: 'PATCH',
    requestBody,
    responseSchema: ideaUpdatedResponseSchema,
  }).then(() => undefined)
}

/** Toggles the current user's vote. Returns the new voted state. */
export function toggleIdeaVoteRequest(ideaId: string): Promise<{ isVotedByCurrentUser: boolean }> {
  return requestFromApi(`/api/ideas/${ideaId}/vote`, {
    method: 'POST',
    responseSchema: ideaVoteToggledResponseSchema,
  })
}

/** Adds a comment to an idea. */
export function createIdeaCommentRequest(
  ideaId: string,
  requestBody: CreateIdeaCommentRequest,
): Promise<{ commentId: string }> {
  createIdeaCommentRequestSchema.parse(requestBody) // fail fast in the form
  return requestFromApi(`/api/ideas/${ideaId}/comments`, {
    method: 'POST',
    requestBody,
    responseSchema: ideaCommentCreatedResponseSchema,
  })
}
