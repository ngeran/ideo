// =============================================================================
// FILE:    apps/web/src/features/ideas/hooks/use-idea-mutations.ts
// PURPOSE: Idea mutations: create, update (stage/scores/tags), toggle vote
//          (optimistic across every cached board page), and comment. All of
//          them keep the board cache honest and report failures as toasts.
// USED BY: idea composer, drawer, cards
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateIdeaRequest, UpdateIdeaRequest } from '@ideo/shared'
import { toast } from 'sonner'
import { ApiRequestError } from '../../../shared/lib/api-client'
import {
  createIdeaCommentRequest,
  createIdeaRequest,
  toggleIdeaVoteRequest,
  updateIdeaRequest,
} from '../api/idea-api'
import { IDEA_DETAIL_QUERY_KEY_PREFIX } from './use-idea-detail'
import { IDEA_LIST_QUERY_KEY_PREFIX } from './use-idea-list'

// ---- Internal helpers -------------------------------------------------------

/** Shows a friendly toast for a failed idea mutation. */
function reportIdeaMutationFailure(actionDescription: string, mutationError: unknown): void {
  const isApiError = mutationError instanceof ApiRequestError
  const failureMessage = isApiError ? mutationError.message : 'Something went wrong. Try again.'
  toast.error(`${actionDescription}: ${failureMessage}`)
}

// ---- Hooks ------------------------------------------------------------------

/**
 * Creates an idea and refreshes the board.
 * Returns the mutation; onCreated receives the new idea's id.
 */
export function useCreateIdea(workspaceId: string, onCreated: (ideaId: string) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: CreateIdeaRequest) => createIdeaRequest(workspaceId, requestBody),
    onSuccess: async (mutationResponse) => {
      toast.success(`“${mutationResponse.idea.title}” added to the board.`)
      await queryClient.invalidateQueries({ queryKey: [IDEA_LIST_QUERY_KEY_PREFIX] })
      onCreated(mutationResponse.idea.ideaId)
    },
    onError: (mutationError) => reportIdeaMutationFailure('Could not add the idea', mutationError),
  })
}

/**
 * Updates an idea (stage, scores, tags) and refreshes board + detail caches.
 * Returns the mutation.
 */
export function useUpdateIdea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: { ideaId: string; updateFields: UpdateIdeaRequest }) =>
      updateIdeaRequest(request.ideaId, request.updateFields),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [IDEA_LIST_QUERY_KEY_PREFIX] })
      await queryClient.invalidateQueries({ queryKey: [IDEA_DETAIL_QUERY_KEY_PREFIX] })
    },
    onError: (mutationError) => reportIdeaMutationFailure('Could not update the idea', mutationError),
  })
}

/**
 * Toggles a vote with an optimistic update: the card reacts instantly, and
 * every cached board page is corrected when the server answers.
 * Returns the mutation.
 */
export function useToggleIdeaVote(ideaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleIdeaVoteRequest(ideaId),
    // Optimistic: flip the vote in every cached board page and the drawer.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [IDEA_LIST_QUERY_KEY_PREFIX] })
      await queryClient.cancelQueries({ queryKey: [IDEA_DETAIL_QUERY_KEY_PREFIX, ideaId] })

      queryClient.setQueriesData<{ ideas: Array<{ id: string; hasVotedByCurrentUser: boolean; voteCount: number }> }>(
        { queryKey: [IDEA_LIST_QUERY_KEY_PREFIX] },
        (cachedPage) =>
          cachedPage === undefined
            ? undefined
            : {
                ...cachedPage,
                ideas: cachedPage.ideas.map((listedIdea) =>
                  listedIdea.id === ideaId
                    ? {
                        ...listedIdea,
                        hasVotedByCurrentUser: !listedIdea.hasVotedByCurrentUser,
                        voteCount: listedIdea.voteCount + (listedIdea.hasVotedByCurrentUser ? -1 : 1),
                      }
                    : listedIdea,
                ),
              },
      )
    },
    onError: (mutationError) => {
      reportIdeaMutationFailure('Could not save your vote', mutationError)
      void queryClient.invalidateQueries({ queryKey: [IDEA_LIST_QUERY_KEY_PREFIX] })
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [IDEA_LIST_QUERY_KEY_PREFIX] })
      void queryClient.invalidateQueries({ queryKey: [IDEA_DETAIL_QUERY_KEY_PREFIX, ideaId] })
    },
  })
}

/**
 * Adds a comment to an idea and refreshes the detail and board caches.
 * Returns the mutation; the caller clears its input on success.
 */
export function useAddIdeaComment(ideaId: string, onCommented: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentText: string) => createIdeaCommentRequest(ideaId, { commentText }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [IDEA_DETAIL_QUERY_KEY_PREFIX, ideaId] })
      await queryClient.invalidateQueries({ queryKey: [IDEA_LIST_QUERY_KEY_PREFIX] })
      onCommented()
    },
    onError: (mutationError) => reportIdeaMutationFailure('Could not post the comment', mutationError),
  })
}
