// =============================================================================
// FILE:    apps/web/src/features/workspaces/api/workspace-api.ts
// PURPOSE: Every workspaces API call the web app makes, in one place: me,
//          create, join, read one, and create invite. Parses responses with
//          the shared schemas via the api client.
// USED BY: features/workspaces/hooks/*.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type {
  CreateWorkspaceInviteRequest,
  CreateWorkspaceRequest,
  JoinWorkspaceRequest,
  MeResponse,
  WorkspaceDetailResponse,
  WorkspaceInviteCreatedResponse,
  WorkspaceMutationResponse,
} from '@ideo/shared'
import {
  createWorkspaceInviteRequestSchema,
  createWorkspaceRequestSchema,
  meResponseSchema,
  workspaceDetailResponseSchema,
  workspaceInviteCreatedResponseSchema,
  workspaceMutationResponseSchema,
} from '@ideo/shared'
import { requestFromApi } from '../../../shared/lib/api-client'

// ---- Requests ---------------------------------------------------------------

/** Fetches the signed-in user and their workspaces (GET /api/me). */
export function fetchCurrentUser(): Promise<MeResponse> {
  return requestFromApi('/api/me', { method: 'GET', responseSchema: meResponseSchema })
}

/** Creates a workspace; the caller becomes its owner. */
export function createWorkspaceRequest(
  requestBody: CreateWorkspaceRequest,
): Promise<WorkspaceMutationResponse> {
  createWorkspaceRequestSchema.parse(requestBody) // fail fast in the form, not on the server
  return requestFromApi('/api/workspaces', {
    method: 'POST',
    requestBody,
    responseSchema: workspaceMutationResponseSchema,
  })
}

/** Joins a workspace using an invite code. */
export function joinWorkspaceRequest(
  requestBody: JoinWorkspaceRequest,
): Promise<WorkspaceMutationResponse> {
  return requestFromApi('/api/workspaces/join', {
    method: 'POST',
    requestBody,
    responseSchema: workspaceMutationResponseSchema,
  })
}

/** Reads one workspace with its members (members only). */
export function fetchWorkspaceDetail(workspaceId: string): Promise<WorkspaceDetailResponse> {
  return requestFromApi(`/api/workspaces/${workspaceId}`, {
    method: 'GET',
    responseSchema: workspaceDetailResponseSchema,
  })
}

/** Creates an invite for a workspace (members only). */
export function createWorkspaceInviteRequest(
  workspaceId: string,
  requestBody: CreateWorkspaceInviteRequest,
): Promise<WorkspaceInviteCreatedResponse> {
  createWorkspaceInviteRequestSchema.parse(requestBody)
  return requestFromApi(`/api/workspaces/${workspaceId}/invites`, {
    method: 'POST',
    requestBody,
    responseSchema: workspaceInviteCreatedResponseSchema,
  })
}
