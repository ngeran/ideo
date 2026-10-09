// =============================================================================
// FILE:    apps/web/src/features/workspaces/hooks/use-workspace-mutations.ts
// PURPOSE: Mutations that change the user's workspaces: create one, join one
//          with an invite, and create an invite for teammates. All three
//          report success/error as toasts and keep the identity cache fresh.
// USED BY: create-workspace-dialog, join-workspace-dialog, invite-dialog
// =============================================================================

import type { CreateWorkspaceRequest, JoinWorkspaceRequest } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiRequestError } from '../../../shared/lib/api-client'
import {
  createWorkspaceInviteRequest,
  createWorkspaceRequest,
  joinWorkspaceRequest,
} from '../api/workspace-api'
import { CURRENT_USER_QUERY_KEY } from './use-current-user'

// ---- Internal helpers -------------------------------------------------------

/** Shows a friendly toast for a failed mutation. */
function reportMutationFailure(actionDescription: string, mutationError: unknown): void {
  const isApiError = mutationError instanceof ApiRequestError
  const failureMessage = isApiError ? mutationError.message : 'Something went wrong. Try again.'
  toast.error(`${actionDescription}: ${failureMessage}`)
}

// ---- Hooks ------------------------------------------------------------------

/**
 * Creates a workspace (the caller becomes owner) and refreshes memberships.
 * Returns the mutation; on success the workspace is ready to select.
 */
export function useCreateWorkspace(onCreated: (workspaceId: string) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: CreateWorkspaceRequest) => createWorkspaceRequest(requestBody),
    onSuccess: async (mutationResponse) => {
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      toast.success(`Workspace “${mutationResponse.workspace.name}” is ready.`)
      onCreated(mutationResponse.workspace.id)
    },
    onError: (mutationError) =>
      reportMutationFailure('Could not create the workspace', mutationError),
  })
}

/**
 * Joins a workspace with an invite code and refreshes memberships.
 * Returns the mutation; onCreated receives the joined workspace id.
 */
export function useJoinWorkspace(onJoined: (workspaceId: string) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: JoinWorkspaceRequest) => joinWorkspaceRequest(requestBody),
    onSuccess: async (mutationResponse) => {
      await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY })
      toast.success(`You joined “${mutationResponse.workspace.name}”.`)
      onJoined(mutationResponse.workspace.id)
    },
    onError: (mutationError) => reportMutationFailure('Could not join', mutationError),
  })
}

/**
 * Creates an invite for a workspace.
 * Returns the mutation; onCreated receives the invite code for display.
 */
export function useCreateWorkspaceInvite(onCreated: (inviteCode: string) => void) {
  return useMutation({
    mutationFn: (request: { workspaceId: string; maximumUses?: number; expiresInDays?: number }) =>
      createWorkspaceInviteRequest(request.workspaceId, {
        maximumUses: request.maximumUses ?? 25,
        expiresInDays: request.expiresInDays ?? 14,
      }),
    onSuccess: (mutationResponse) => onCreated(mutationResponse.invite.inviteCode),
    onError: (mutationError) => reportMutationFailure('Could not create an invite', mutationError),
  })
}
