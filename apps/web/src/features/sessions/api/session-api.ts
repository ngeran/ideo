// =============================================================================
// FILE:    apps/web/src/features/sessions/api/session-api.ts
// PURPOSE: Every brainstorm-session API call the web app makes: create,
//          list, read detail (session + sparks), start, end, and add a
//          spark. Parses responses with the shared schemas via the api client.
// USED BY: features/sessions/hooks/*.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type {
  AddSessionSparkRequest,
  BrainstormListResponse,
  BrainstormSessionDetailResponse,
  CreateBrainstormSessionRequest,
  SessionCreatedResponse,
  SparkAddedResponse,
} from '@ideo/shared'
import {
  addSessionSparkRequestSchema,
  brainstormListResponseSchema,
  brainstormSessionDetailResponseSchema,
  createBrainstormSessionRequestSchema,
  sessionCreatedResponseSchema,
  sessionEndedResponseSchema,
  sessionStartedResponseSchema,
  sparkAddedResponseSchema,
} from '@ideo/shared'
import { requestFromApi } from '../../../shared/lib/api-client'

// ---- Types ------------------------------------------------------------------

/** Paging for the session listing. */
export type SessionListParameters = {
  cursor?: string | undefined
  limit?: number
}

// ---- Requests ---------------------------------------------------------------

/** Fetches one page of the workspace's sessions, newest first. */
export function fetchSessionList(
  workspaceId: string,
  listParameters: SessionListParameters,
): Promise<BrainstormListResponse> {
  const searchParameters = new URLSearchParams()
  if (listParameters.cursor !== undefined) searchParameters.set('cursor', listParameters.cursor)
  if (listParameters.limit !== undefined)
    searchParameters.set('limit', String(listParameters.limit))
  const queryString = searchParameters.toString()
  return requestFromApi(
    `/api/workspaces/${workspaceId}/brainstorm-sessions${queryString ? `?${queryString}` : ''}`,
    { method: 'GET', responseSchema: brainstormListResponseSchema },
  )
}

/** Fetches one session with its sparks (anonymity applied by the server). */
export function fetchSessionDetail(sessionId: string): Promise<BrainstormSessionDetailResponse> {
  return requestFromApi(`/api/brainstorm-sessions/${sessionId}`, {
    method: 'GET',
    responseSchema: brainstormSessionDetailResponseSchema,
  })
}

/** Creates a session (scheduled, not started). */
export function createSessionRequest(
  workspaceId: string,
  requestBody: CreateBrainstormSessionRequest,
): Promise<SessionCreatedResponse> {
  createBrainstormSessionRequestSchema.parse(requestBody) // fail fast in the form
  return requestFromApi(`/api/workspaces/${workspaceId}/brainstorm-sessions`, {
    method: 'POST',
    requestBody,
    responseSchema: sessionCreatedResponseSchema,
  })
}

/** Starts a session's timer. */
export function startSessionRequest(sessionId: string): Promise<void> {
  return requestFromApi(`/api/brainstorm-sessions/${sessionId}/start`, {
    method: 'POST',
    responseSchema: sessionStartedResponseSchema,
  }).then(() => undefined)
}

/** Ends a session (anonymous sparks reveal their authors). */
export function endSessionRequest(sessionId: string): Promise<void> {
  return requestFromApi(`/api/brainstorm-sessions/${sessionId}/end`, {
    method: 'POST',
    responseSchema: sessionEndedResponseSchema,
  }).then(() => undefined)
}

/** Adds a spark to a running session (it lands on the board as an idea). */
export function addSessionSparkRequest(
  sessionId: string,
  requestBody: AddSessionSparkRequest,
): Promise<SparkAddedResponse> {
  addSessionSparkRequestSchema.parse(requestBody) // fail fast in the form
  return requestFromApi(`/api/brainstorm-sessions/${sessionId}/sparks`, {
    method: 'POST',
    requestBody,
    responseSchema: sparkAddedResponseSchema,
  })
}
