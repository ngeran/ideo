// =============================================================================
// FILE:    apps/web/src/features/plans/api/plan-api.ts
// PURPOSE: Every plan and task API call the web app makes: promote an idea,
//          list plans, read plan detail, update a plan, add a milestone, add
//          a task, and move a task around the board. Parses responses with
//          the shared schemas via the api client.
// USED BY: features/plans/hooks/*.ts, features/ideas (promote button)
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import type {
  CreatePlanMilestoneRequest,
  CreatePlanTaskRequest,
  MilestoneCreatedResponse,
  PlanCreatedResponse,
  PlanDetailResponse,
  PlanListResponse,
  TaskCreatedResponse,
  UpdatePlanRequest,
  UpdateTaskRequest,
} from '@ideo/shared'
import {
  createPlanMilestoneRequestSchema,
  createPlanTaskRequestSchema,
  milestoneCreatedResponseSchema,
  planCreatedResponseSchema,
  planDetailResponseSchema,
  planListResponseSchema,
  planUpdatedResponseSchema,
  promoteIdeaToPlanRequestSchema,
  taskCreatedResponseSchema,
  updateTaskRequestSchema,
} from '@ideo/shared'
import { requestFromApi } from '../../../shared/lib/api-client'

// ---- Types ------------------------------------------------------------------

/** Paging for the plan listing. */
export type PlanListParameters = {
  cursor?: string | undefined
  limit?: number
}

// ---- Requests ---------------------------------------------------------------

/** Fetches one page of the workspace's plans, newest first. */
export function fetchPlanList(
  workspaceId: string,
  listParameters: PlanListParameters,
): Promise<PlanListResponse> {
  const searchParameters = new URLSearchParams()
  if (listParameters.cursor !== undefined) searchParameters.set('cursor', listParameters.cursor)
  if (listParameters.limit !== undefined)
    searchParameters.set('limit', String(listParameters.limit))
  const queryString = searchParameters.toString()
  return requestFromApi(
    `/api/workspaces/${workspaceId}/plans${queryString ? `?${queryString}` : ''}`,
    {
      method: 'GET',
      responseSchema: planListResponseSchema,
    },
  )
}

/** Fetches one plan with its milestones and tasks. */
export function fetchPlanDetail(planId: string): Promise<PlanDetailResponse> {
  return requestFromApi(`/api/plans/${planId}`, {
    method: 'GET',
    responseSchema: planDetailResponseSchema,
  })
}

/** Promotes an idea into a plan (the idea moves to the planned stage). */
export function promoteIdeaToPlanRequest(ideaId: string): Promise<PlanCreatedResponse> {
  promoteIdeaToPlanRequestSchema.parse({}) // fail fast, and send a valid empty body
  return requestFromApi(`/api/ideas/${ideaId}/promote-to-plan`, {
    method: 'POST',
    requestBody: {},
    responseSchema: planCreatedResponseSchema,
  })
}

/** Updates a plan's title, summary, or status. */
export function updatePlanRequest(planId: string, requestBody: UpdatePlanRequest): Promise<void> {
  return requestFromApi(`/api/plans/${planId}`, {
    method: 'PATCH',
    requestBody,
    responseSchema: planUpdatedResponseSchema,
  }).then(() => undefined)
}

/** Adds a milestone to a plan's timeline. */
export function createPlanMilestoneRequest(
  planId: string,
  requestBody: CreatePlanMilestoneRequest,
): Promise<MilestoneCreatedResponse> {
  createPlanMilestoneRequestSchema.parse(requestBody) // fail fast in the form
  return requestFromApi(`/api/plans/${planId}/milestones`, {
    method: 'POST',
    requestBody,
    responseSchema: milestoneCreatedResponseSchema,
  })
}

/** Adds a task to a plan's board (it starts in To do). */
export function createPlanTaskRequest(
  planId: string,
  requestBody: CreatePlanTaskRequest,
): Promise<TaskCreatedResponse> {
  createPlanTaskRequestSchema.parse(requestBody) // fail fast in the form
  return requestFromApi(`/api/plans/${planId}/tasks`, {
    method: 'POST',
    requestBody,
    responseSchema: taskCreatedResponseSchema,
  })
}

/** Moves a task around the board (status, assignee, milestone, order). */
export function updatePlanTaskRequest(
  taskId: string,
  requestBody: UpdateTaskRequest,
): Promise<void> {
  updateTaskRequestSchema.parse(requestBody) // fail fast in the form
  return requestFromApi(`/api/tasks/${taskId}`, {
    method: 'PATCH',
    requestBody,
    responseSchema: planUpdatedResponseSchema,
  }).then(() => undefined)
}
