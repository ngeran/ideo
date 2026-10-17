// =============================================================================
// FILE:    apps/web/src/features/sessions/hooks/use-session-mutations.ts
// PURPOSE: Brainstorm session mutations: create, start, end, and add a
//          spark. All of them keep the session caches honest and report
//          failures as toasts.
// USED BY: sessions-page.tsx
// =============================================================================

import type { AddSessionSparkRequest, CreateBrainstormSessionRequest } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiRequestError } from '../../../shared/lib/api-client'
import { IDEA_LIST_QUERY_KEY_PREFIX } from '../../ideas/hooks/use-idea-list'
import {
  addSessionSparkRequest,
  createSessionRequest,
  endSessionRequest,
  startSessionRequest,
} from '../api/session-api'
import { SESSION_DETAIL_QUERY_KEY_PREFIX } from './use-session-detail'
import { SESSION_LIST_QUERY_KEY_PREFIX } from './use-session-list'

// ---- Internal helpers -------------------------------------------------------

/** Shows a friendly toast for a failed session mutation. */
function reportSessionMutationFailure(actionDescription: string, mutationError: unknown): void {
  const isApiError = mutationError instanceof ApiRequestError
  const failureMessage = isApiError ? mutationError.message : 'Something went wrong. Try again.'
  toast.error(`${actionDescription}: ${failureMessage}`)
}

// ---- Hooks ------------------------------------------------------------------

/**
 * Creates a session and refreshes the session list.
 * Returns the mutation; onCreated receives the new session's id.
 */
export function useCreateSession(onCreated: (sessionId: string) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: {
      workspaceId: string
      sessionRequest: CreateBrainstormSessionRequest
    }) => createSessionRequest(request.workspaceId, request.sessionRequest),
    onSuccess: async (mutationResponse) => {
      toast.success(`“${mutationResponse.session.topic}” is ready to start.`)
      await queryClient.invalidateQueries({ queryKey: [SESSION_LIST_QUERY_KEY_PREFIX] })
      onCreated(mutationResponse.session.sessionId)
    },
    onError: (mutationError) =>
      reportSessionMutationFailure('Could not create the session', mutationError),
  })
}

/**
 * Starts a session's timer and refreshes its caches.
 * Returns the mutation.
 */
export function useStartSession(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => startSessionRequest(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SESSION_LIST_QUERY_KEY_PREFIX] })
      await queryClient.invalidateQueries({
        queryKey: [SESSION_DETAIL_QUERY_KEY_PREFIX, sessionId],
      })
    },
    onError: (mutationError) =>
      reportSessionMutationFailure('Could not start the session', mutationError),
  })
}

/**
 * Ends a session (anonymous sparks reveal their authors) and refreshes the
 * session and board caches.
 * Returns the mutation.
 */
export function useEndSession(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => endSessionRequest(sessionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [SESSION_LIST_QUERY_KEY_PREFIX] })
      await queryClient.invalidateQueries({
        queryKey: [SESSION_DETAIL_QUERY_KEY_PREFIX, sessionId],
      })
      // Anonymous sparks just revealed their authors on the board too.
      await queryClient.invalidateQueries({ queryKey: [IDEA_LIST_QUERY_KEY_PREFIX] })
    },
    onError: (mutationError) =>
      reportSessionMutationFailure('Could not end the session', mutationError),
  })
}

/**
 * Adds a spark to a running session and refreshes the session caches.
 * Returns the mutation; the caller clears its input on success.
 */
export function useAddSessionSpark(sessionId: string, onAdded: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: AddSessionSparkRequest) =>
      addSessionSparkRequest(sessionId, requestBody),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [SESSION_DETAIL_QUERY_KEY_PREFIX, sessionId],
      })
      await queryClient.invalidateQueries({ queryKey: [SESSION_LIST_QUERY_KEY_PREFIX] })
      onAdded()
    },
    onError: (mutationError) =>
      reportSessionMutationFailure('Could not add the spark', mutationError),
  })
}
