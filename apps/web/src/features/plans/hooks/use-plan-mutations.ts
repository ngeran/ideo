// =============================================================================
// FILE:    apps/web/src/features/plans/hooks/use-plan-mutations.ts
// PURPOSE: Plan and task mutations: promote an idea to a plan, update a
//          plan, add a milestone, add a task, and move a task around the
//          board. All of them keep the plan caches honest and report
//          failures as toasts.
// USED BY: idea drawer (promote), plan page (status, milestones, tasks)
// =============================================================================

import type {
  CreatePlanMilestoneRequest,
  CreatePlanTaskRequest,
  UpdatePlanRequest,
  UpdateTaskRequest,
} from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiRequestError } from '../../../shared/lib/api-client'
import { IDEA_DETAIL_QUERY_KEY_PREFIX } from '../../ideas/hooks/use-idea-detail'
import { IDEA_LIST_QUERY_KEY_PREFIX } from '../../ideas/hooks/use-idea-list'
import {
  createPlanMilestoneRequest,
  createPlanTaskRequest,
  promoteIdeaToPlanRequest,
  updatePlanRequest,
  updatePlanTaskRequest,
} from '../api/plan-api'
import { PLAN_DETAIL_QUERY_KEY_PREFIX } from './use-plan-detail'
import { PLAN_LIST_QUERY_KEY_PREFIX } from './use-plan-list'

// ---- Internal helpers -------------------------------------------------------

/** Shows a friendly toast for a failed plan mutation. */
function reportPlanMutationFailure(actionDescription: string, mutationError: unknown): void {
  const isApiError = mutationError instanceof ApiRequestError
  const failureMessage = isApiError ? mutationError.message : 'Something went wrong. Try again.'
  toast.error(`${actionDescription}: ${failureMessage}`)
}

// ---- Hooks ------------------------------------------------------------------

/**
 * Promotes an idea into a plan and refreshes board + plan caches.
 * Returns the mutation; onPromoted receives the new plan's id.
 */
export function usePromoteIdeaToPlan(onPromoted: (planId: string) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ideaId: string) => promoteIdeaToPlanRequest(ideaId),
    onSuccess: async (mutationResponse) => {
      toast.success(`“${mutationResponse.plan.title}” is now a plan.`)
      // The source idea moved to planned, so the board changes too.
      await queryClient.invalidateQueries({ queryKey: [PLAN_LIST_QUERY_KEY_PREFIX] })
      await queryClient.invalidateQueries({ queryKey: [IDEA_LIST_QUERY_KEY_PREFIX] })
      await queryClient.invalidateQueries({ queryKey: [IDEA_DETAIL_QUERY_KEY_PREFIX] })
      onPromoted(mutationResponse.plan.planId)
    },
    onError: (mutationError) =>
      reportPlanMutationFailure('Could not create the plan', mutationError),
  })
}

/**
 * Updates a plan (title, summary, status) and refreshes the plan caches.
 * Returns the mutation.
 */
export function useUpdatePlan(planId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updateFields: UpdatePlanRequest) => updatePlanRequest(planId, updateFields),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PLAN_LIST_QUERY_KEY_PREFIX] })
      await queryClient.invalidateQueries({ queryKey: [PLAN_DETAIL_QUERY_KEY_PREFIX, planId] })
    },
    onError: (mutationError) =>
      reportPlanMutationFailure('Could not update the plan', mutationError),
  })
}

/**
 * Adds a milestone to a plan's timeline and refreshes the detail cache.
 * Returns the mutation; the caller clears its input on success.
 */
export function useAddPlanMilestone(planId: string, onAdded: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: CreatePlanMilestoneRequest) =>
      createPlanMilestoneRequest(planId, requestBody),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PLAN_LIST_QUERY_KEY_PREFIX] })
      await queryClient.invalidateQueries({ queryKey: [PLAN_DETAIL_QUERY_KEY_PREFIX, planId] })
      onAdded()
    },
    onError: (mutationError) =>
      reportPlanMutationFailure('Could not add the milestone', mutationError),
  })
}

/**
 * Adds a task to a plan's board and refreshes the detail cache.
 * Returns the mutation; the caller clears its input on success.
 */
export function useAddPlanTask(planId: string, onAdded: () => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requestBody: CreatePlanTaskRequest) => createPlanTaskRequest(planId, requestBody),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PLAN_LIST_QUERY_KEY_PREFIX] })
      await queryClient.invalidateQueries({ queryKey: [PLAN_DETAIL_QUERY_KEY_PREFIX, planId] })
      onAdded()
    },
    onError: (mutationError) => reportPlanMutationFailure('Could not add the task', mutationError),
  })
}

/**
 * Moves a task around the board (status, assignee, milestone, order).
 * Returns the mutation.
 */
export function useUpdatePlanTask(planId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: { taskId: string; updateFields: UpdateTaskRequest }) =>
      updatePlanTaskRequest(request.taskId, request.updateFields),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [PLAN_LIST_QUERY_KEY_PREFIX] })
      await queryClient.invalidateQueries({ queryKey: [PLAN_DETAIL_QUERY_KEY_PREFIX, planId] })
    },
    onError: (mutationError) => reportPlanMutationFailure('Could not move the task', mutationError),
  })
}
