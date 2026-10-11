// =============================================================================
// FILE:    apps/worker/src/routes/plan-routes.ts
// PURPOSE: Plan and task endpoints: promote an idea, list a workspace's
//          plans, plan detail (plan + milestones + tasks), plan updates,
//          add milestone, add task, and move a task around the board.
//          Handlers stay thin — parse, delegate to the service, respond.
// USED BY: create-application.ts (mounted at /api)
// =============================================================================

import { zValidator } from '@hono/zod-validator'
import {
  createPlanMilestoneRequestSchema,
  createPlanTaskRequestSchema,
  planDetailResponseSchema,
  planListQuerySchema,
  planListResponseSchema,
  promoteIdeaToPlanRequestSchema,
  updatePlanRequestSchema,
  updateTaskRequestSchema,
} from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import { Hono } from 'hono'
import type { AuthenticatedContext } from '../auth/current-user-middleware'
import { createCurrentUserMiddleware } from '../auth/current-user-middleware'
import type { CurrentUserResolver } from '../auth/current-user-resolver'
import { createDatabase } from '../database/create-database'
import { notifyWorkspaceRoomAfterResponse } from '../realtime/notify-workspace-room'
import {
  addMilestoneToPlanMember,
  addTaskToPlanMember,
  getPlanDetailForMember,
  listPlansForWorkspaceMember,
  promoteIdeaToPlanMember,
  updatePlanForMember,
  updateTaskForMember,
} from '../services/plan-service'
import { validationFailedError } from './api-errors'

// ---- Validation helpers -----------------------------------------------------

/** Turns a failed validation into our standard error body. */
function reportZodFailure(validationResult: {
  success: boolean
  error?: { issues: Array<{ message: string }> }
}) {
  const failedValidation = !validationResult.success && validationResult.error !== undefined
  if (failedValidation) {
    const failureMessages = (validationResult.error?.issues ?? [])
      .map((issue) => issue.message)
      .join('; ')
    throw validationFailedError(failureMessages)
  }
}

// ---- Route factories --------------------------------------------------------

/**
 * Creates the plan route group.
 * Returns a Hono instance mounted under /api with:
 *   POST /ideas/:ideaId/promote-to-plan    idea -> plan (+ idea to planned)
 *   GET  /workspaces/:workspaceId/plans    paginated plan list
 *   GET  /plans/:planId                    plan + milestones + tasks
 *   PATCH /plans/:planId                   title, summary, status
 *   POST /plans/:planId/milestones         add a milestone
 *   POST /plans/:planId/tasks              add a task (To do)
 *   PATCH /tasks/:taskId                   status, assignee, order, title
 */
export function createPlanRoutes(
  currentUserResolver: CurrentUserResolver,
): Hono<AuthenticatedContext> {
  const planRoutes = new Hono<AuthenticatedContext>()

  planRoutes.use('*', createCurrentUserMiddleware(currentUserResolver))

  planRoutes.post(
    '/ideas/:ideaId/promote-to-plan',
    zValidator('json', promoteIdeaToPlanRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const database = createDatabase(requestContext.env.DATABASE)

      const createdPlan = await promoteIdeaToPlanMember(
        database,
        currentUser,
        requestContext.req.param('ideaId'),
      )

      // The plan is new and the source idea just changed stage: nudge both.
      notifyWorkspaceRoomAfterResponse(
        requestContext,
        requestContext.env,
        createdPlan.workspaceId,
        {
          type: 'workspace_event',
          eventType: 'plan_created',
          subjectId: createdPlan.planId,
        },
      )
      notifyWorkspaceRoomAfterResponse(
        requestContext,
        requestContext.env,
        createdPlan.workspaceId,
        {
          type: 'workspace_event',
          eventType: 'idea_updated',
          subjectId: requestContext.req.param('ideaId'),
        },
      )
      return requestContext.json(
        {
          plan: {
            planId: createdPlan.planId,
            title: createdPlan.title,
            planStatus: createdPlan.planStatus,
          },
        },
        201,
      )
    },
  )

  planRoutes.get(
    '/workspaces/:workspaceId/plans',
    zValidator('query', planListQuerySchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const listQuery = requestContext.req.valid('query')
      const database = createDatabase(requestContext.env.DATABASE)

      const listResponse = await listPlansForWorkspaceMember(
        database,
        currentUser,
        requestContext.req.param('workspaceId'),
        listQuery,
      )
      return requestContext.json(planListResponseSchema.parse(listResponse))
    },
  )

  planRoutes.get('/plans/:planId', async (requestContext) => {
    const currentUser = requestContext.get('currentUser')
    const database = createDatabase(requestContext.env.DATABASE)

    const detailResponse = await getPlanDetailForMember(
      database,
      currentUser,
      requestContext.req.param('planId'),
    )
    return requestContext.json(planDetailResponseSchema.parse(detailResponse))
  })

  planRoutes.patch(
    '/plans/:planId',
    zValidator('json', updatePlanRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const updateRequest = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const updatedPlanWorkspaceId = await updatePlanForMember(
        database,
        currentUser,
        requestContext.req.param('planId'),
        updateRequest,
      )

      notifyWorkspaceRoomAfterResponse(requestContext, requestContext.env, updatedPlanWorkspaceId, {
        type: 'workspace_event',
        eventType: 'plan_updated',
        subjectId: requestContext.req.param('planId'),
      })
      return requestContext.json({ ok: true })
    },
  )

  planRoutes.post(
    '/plans/:planId/milestones',
    zValidator('json', createPlanMilestoneRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const milestoneRequest = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const milestoneResult = await addMilestoneToPlanMember(
        database,
        currentUser,
        requestContext.req.param('planId'),
        milestoneRequest,
      )

      notifyWorkspaceRoomAfterResponse(
        requestContext,
        requestContext.env,
        milestoneResult.workspaceId,
        {
          type: 'workspace_event',
          eventType: 'plan_updated',
          subjectId: requestContext.req.param('planId'),
        },
      )
      return requestContext.json({ milestone: { milestoneId: milestoneResult.milestoneId } }, 201)
    },
  )

  planRoutes.post(
    '/plans/:planId/tasks',
    zValidator('json', createPlanTaskRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const taskRequest = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const taskResult = await addTaskToPlanMember(
        database,
        currentUser,
        requestContext.req.param('planId'),
        taskRequest,
      )

      notifyWorkspaceRoomAfterResponse(requestContext, requestContext.env, taskResult.workspaceId, {
        type: 'workspace_event',
        eventType: 'task_updated',
        subjectId: requestContext.req.param('planId'),
      })
      return requestContext.json({ task: { taskId: taskResult.taskId } }, 201)
    },
  )

  planRoutes.patch(
    '/tasks/:taskId',
    zValidator('json', updateTaskRequestSchema, reportZodFailure),
    async (requestContext) => {
      const currentUser = requestContext.get('currentUser')
      const updateRequest = requestContext.req.valid('json')
      const database = createDatabase(requestContext.env.DATABASE)

      const taskResult = await updateTaskForMember(
        database,
        currentUser,
        requestContext.req.param('taskId'),
        updateRequest,
      )

      notifyWorkspaceRoomAfterResponse(requestContext, requestContext.env, taskResult.workspaceId, {
        type: 'workspace_event',
        eventType: 'task_updated',
        subjectId: taskResult.planId,
      })
      return requestContext.json({ ok: true })
    },
  )

  return planRoutes
}
