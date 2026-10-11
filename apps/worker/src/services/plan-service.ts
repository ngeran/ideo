// =============================================================================
// FILE:    apps/worker/src/services/plan-service.ts
// PURPOSE: Business rules for plans and tasks: promote an idea to a plan
//          (moving the idea to the planned stage), list plans (paginated),
//          read a plan with its milestones and tasks, update a plan, add
//          milestones and tasks, and move tasks around the board. Every
//          mutation records an activity event in the same transaction.
// USED BY: routes/plan-routes.ts
// =============================================================================

import type {
  CreatePlanMilestoneRequest,
  CreatePlanTaskRequest,
  PlanDetailResponse,
  PlanListQuery,
  PlanListResponse,
  PlanMilestoneResponse,
  PlanResponse,
  PlanTaskResponse,
  UpdatePlanRequest,
  UpdateTaskRequest,
} from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import type { UserRecord } from '../configuration/record-types'
import { buildInsertActivityEventStatement } from '../database/activity-event-queries'
import type { IdeoDatabase } from '../database/create-database'
import { asBatchStatements } from '../database/create-database'
import { buildUpdateIdeaStatement, findIdeaByIdWithAuthor } from '../database/idea-queries'
import {
  buildInsertMilestoneStatement,
  buildInsertPlanStatement,
  buildInsertTaskStatement,
  buildUpdatePlanStatement,
  buildUpdateTaskStatement,
  findMilestoneById,
  findPlanByIdWithCreator,
  findTaskById,
  listMilestonesForPlan,
  listPlansForWorkspace,
  listTasksForPlan,
} from '../database/plan-queries'
import { findWorkspaceMember } from '../database/workspace-member-queries'
import { validationFailedError, workspaceAccessDeniedError } from '../routes/api-errors'

// ---- Types ------------------------------------------------------------------

/** The parts of a created plan the route needs to answer with. */
export type CreatedPlanSummary = {
  planId: string
  title: string
  planStatus: string
  workspaceId: string
}

// ---- Internal helpers ---------------------------------------------------------

/** One ISO-8601 timestamp, shared by all statements in a service call. */
function createIsoTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Guarantees the caller is a member of the plan's workspace.
 * Returns the plan row; throws the standard 404 when the plan is absent or
 * the caller is an outsider.
 */
async function findPlanForMember(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  planId: string,
) {
  const foundPlan = await findPlanByIdWithCreator(database, planId)
  if (!foundPlan) throw workspaceAccessDeniedError()

  const membership = await findWorkspaceMember(
    database,
    foundPlan.plan.workspaceId,
    requestingUser.id,
  )
  if (!membership) throw workspaceAccessDeniedError()

  return foundPlan
}

// ---- Promote ------------------------------------------------------------------

/**
 * Promotes an idea into a plan: the plan inherits the idea's title and
 * description (as summary), starts in draft, and the idea moves to the
 * planned stage. One transaction writes the plan, the stage change, and the
 * activity events.
 * Returns the new plan's summary plus its workspace id (for the room).
 */
export async function promoteIdeaToPlanMember(
  database: IdeoDatabase,
  promotingUser: UserRecord,
  ideaId: string,
): Promise<CreatedPlanSummary> {
  const foundIdea = await findIdeaByIdWithAuthor(database, ideaId)
  if (!foundIdea) throw workspaceAccessDeniedError()

  const workspaceId = foundIdea.idea.workspaceId
  const membership = await findWorkspaceMember(database, workspaceId, promotingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const planId = crypto.randomUUID()
  const promotedAt = createIsoTimestamp()

  await database.batch(
    asBatchStatements([
      buildInsertPlanStatement(database, {
        id: planId,
        workspaceId,
        sourceIdeaId: ideaId,
        title: foundIdea.idea.title,
        summary: foundIdea.idea.description,
        planStatus: 'draft',
        createdByUserId: promotingUser.id,
        createdAt: promotedAt,
        updatedAt: promotedAt,
      }),
      buildUpdateIdeaStatement(database, ideaId, { stage: 'planned', updatedAt: promotedAt }),
      buildInsertActivityEventStatement(database, {
        id: crypto.randomUUID(),
        workspaceId,
        actorUserId: promotingUser.id,
        eventType: 'plan_created',
        subjectType: 'plan',
        subjectId: planId,
        summaryText: `${promotingUser.displayName} turned “${foundIdea.idea.title}” into a plan`,
        createdAt: promotedAt,
      }),
      buildInsertActivityEventStatement(database, {
        id: crypto.randomUUID(),
        workspaceId,
        actorUserId: promotingUser.id,
        eventType: 'idea_stage_changed',
        subjectType: 'idea',
        subjectId: ideaId,
        summaryText: `${promotingUser.displayName} moved “${foundIdea.idea.title}” to Planned`,
        createdAt: promotedAt,
      }),
    ]),
  )

  return { planId, title: foundIdea.idea.title, planStatus: 'draft', workspaceId }
}

// ---- List ---------------------------------------------------------------------

/** Lists one page of the workspace's plans for a member. */
export async function listPlansForWorkspaceMember(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  workspaceId: string,
  listQuery: PlanListQuery,
): Promise<PlanListResponse> {
  const membership = await findWorkspaceMember(database, workspaceId, requestingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const listPage = await listPlansForWorkspace(database, workspaceId, {
    cursor: listQuery.cursor,
    limit: listQuery.limit,
  })

  const planResponses: PlanResponse[] = listPage.rows.map((listRow) => ({
    id: listRow.plan.id,
    workspaceId: listRow.plan.workspaceId,
    sourceIdeaId: listRow.plan.sourceIdeaId,
    title: listRow.plan.title,
    summary: listRow.plan.summary,
    planStatus: listRow.plan.planStatus as PlanResponse['planStatus'],
    createdBy: {
      userId: listRow.plan.createdByUserId,
      displayName: listRow.creatorDisplayName,
      avatarColor: listRow.creatorAvatarColor,
    },
    taskTotal: listRow.taskTotal,
    taskDoneCount: listRow.taskDoneCount,
    createdAt: listRow.plan.createdAt,
    updatedAt: listRow.plan.updatedAt,
  }))

  return { plans: planResponses, nextCursor: listPage.nextCursor }
}

// ---- Detail -------------------------------------------------------------------

/** Reads one plan with its milestones and tasks for a member. */
export async function getPlanDetailForMember(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  planId: string,
): Promise<PlanDetailResponse> {
  const foundPlan = await findPlanForMember(database, requestingUser, planId)

  const [milestoneRows, taskRows] = await Promise.all([
    listMilestonesForPlan(database, planId),
    listTasksForPlan(database, planId),
  ])

  const milestoneResponses: PlanMilestoneResponse[] = milestoneRows.map((milestoneRow) => ({
    id: milestoneRow.id,
    title: milestoneRow.title,
    dueDate: milestoneRow.dueDate,
    isDone: milestoneRow.isDone === 1,
    sortOrder: milestoneRow.sortOrder,
  }))

  const taskResponses: PlanTaskResponse[] = taskRows.map((taskRow) => ({
    id: taskRow.task.id,
    planId: taskRow.task.planId,
    milestoneId: taskRow.task.milestoneId,
    title: taskRow.task.title,
    taskStatus: taskRow.task.taskStatus as PlanTaskResponse['taskStatus'],
    assignee:
      taskRow.assigneeDisplayName === null
        ? null
        : {
            userId: taskRow.task.assigneeUserId ?? '',
            displayName: taskRow.assigneeDisplayName,
            avatarColor: taskRow.assigneeAvatarColor ?? '#0e7490',
          },
    sortOrder: taskRow.task.sortOrder,
    createdAt: taskRow.task.createdAt,
    updatedAt: taskRow.task.updatedAt,
  }))

  return {
    plan: {
      id: foundPlan.plan.id,
      workspaceId: foundPlan.plan.workspaceId,
      sourceIdeaId: foundPlan.plan.sourceIdeaId,
      title: foundPlan.plan.title,
      summary: foundPlan.plan.summary,
      planStatus: foundPlan.plan.planStatus as PlanResponse['planStatus'],
      createdBy: {
        userId: foundPlan.plan.createdByUserId,
        displayName: foundPlan.creatorDisplayName,
        avatarColor: foundPlan.creatorAvatarColor,
      },
      taskTotal: taskResponses.length,
      taskDoneCount: taskResponses.filter((taskResponse) => taskResponse.taskStatus === 'done')
        .length,
      createdAt: foundPlan.plan.createdAt,
      updatedAt: foundPlan.plan.updatedAt,
    },
    milestones: milestoneResponses,
    tasks: taskResponses,
  }
}

// ---- Plan updates -------------------------------------------------------------

/** Updates a plan's title, summary, or status. Returns the workspace id. */
export async function updatePlanForMember(
  database: IdeoDatabase,
  editingUser: UserRecord,
  planId: string,
  updateRequest: UpdatePlanRequest,
): Promise<string> {
  const foundPlan = await findPlanForMember(database, editingUser, planId)
  const updatedAt = createIsoTimestamp()

  await database.batch(
    asBatchStatements([
      buildUpdatePlanStatement(database, planId, { ...updateRequest, updatedAt }),
      buildInsertActivityEventStatement(database, {
        id: crypto.randomUUID(),
        workspaceId: foundPlan.plan.workspaceId,
        actorUserId: editingUser.id,
        eventType: 'plan_updated',
        subjectType: 'plan',
        subjectId: planId,
        summaryText: `${editingUser.displayName} updated the plan “${foundPlan.plan.title}”`,
        createdAt: updatedAt,
      }),
    ]),
  )

  return foundPlan.plan.workspaceId
}

// ---- Milestones ----------------------------------------------------------------

/**
 * Adds a milestone to a plan's timeline (appended last).
 * Returns the milestone's id plus the workspace id (for the room).
 */
export async function addMilestoneToPlanMember(
  database: IdeoDatabase,
  addingUser: UserRecord,
  planId: string,
  milestoneRequest: CreatePlanMilestoneRequest,
): Promise<{ milestoneId: string; workspaceId: string }> {
  const foundPlan = await findPlanForMember(database, addingUser, planId)

  const existingMilestones = await listMilestonesForPlan(database, planId)
  const nextSortOrder = existingMilestones.length + 1
  const milestoneId = crypto.randomUUID()
  const createdAt = createIsoTimestamp()

  await database.batch(
    asBatchStatements([
      buildInsertMilestoneStatement(database, {
        id: milestoneId,
        planId,
        title: milestoneRequest.title,
        dueDate: milestoneRequest.dueDate,
        isDone: 0,
        sortOrder: nextSortOrder,
      }),
      buildInsertActivityEventStatement(database, {
        id: crypto.randomUUID(),
        workspaceId: foundPlan.plan.workspaceId,
        actorUserId: addingUser.id,
        eventType: 'milestone_created',
        subjectType: 'plan',
        subjectId: planId,
        summaryText: `${addingUser.displayName} added a milestone to “${foundPlan.plan.title}”`,
        createdAt,
      }),
    ]),
  )

  return { milestoneId, workspaceId: foundPlan.plan.workspaceId }
}

// ---- Tasks ---------------------------------------------------------------------

/**
 * Adds a task to a plan's board (top of To do).
 * Returns the task's id plus the workspace id (for the room).
 */
export async function addTaskToPlanMember(
  database: IdeoDatabase,
  addingUser: UserRecord,
  planId: string,
  taskRequest: CreatePlanTaskRequest,
): Promise<{ taskId: string; workspaceId: string }> {
  const foundPlan = await findPlanForMember(database, addingUser, planId)

  if (taskRequest.milestoneId !== null) {
    await assertMilestoneBelongsToPlan(database, planId, taskRequest.milestoneId)
  }
  if (taskRequest.assigneeUserId !== null) {
    await assertAssigneeIsMember(database, foundPlan.plan.workspaceId, taskRequest.assigneeUserId)
  }

  const existingTasks = await listTasksForPlan(database, planId)
  const nextSortOrder = Math.max(0, ...existingTasks.map((taskRow) => taskRow.task.sortOrder)) + 1
  const taskId = crypto.randomUUID()
  const createdAt = createIsoTimestamp()

  await database.batch(
    asBatchStatements([
      buildInsertTaskStatement(database, {
        id: taskId,
        planId,
        milestoneId: taskRequest.milestoneId,
        title: taskRequest.title,
        taskStatus: 'todo',
        assigneeUserId: taskRequest.assigneeUserId,
        sortOrder: nextSortOrder,
        createdAt,
        updatedAt: createdAt,
      }),
      buildInsertActivityEventStatement(database, {
        id: crypto.randomUUID(),
        workspaceId: foundPlan.plan.workspaceId,
        actorUserId: addingUser.id,
        eventType: 'task_created',
        subjectType: 'plan',
        subjectId: planId,
        summaryText: `${addingUser.displayName} added a task to “${foundPlan.plan.title}”`,
        createdAt,
      }),
    ]),
  )

  return { taskId, workspaceId: foundPlan.plan.workspaceId }
}

/**
 * Moves a task around the board: status, assignee, milestone, order, title.
 * Returns the workspace and plan ids (for the room and the detail cache).
 */
export async function updateTaskForMember(
  database: IdeoDatabase,
  editingUser: UserRecord,
  taskId: string,
  updateRequest: UpdateTaskRequest,
): Promise<{ workspaceId: string; planId: string }> {
  const foundTask = await findTaskById(database, taskId)
  if (!foundTask) throw workspaceAccessDeniedError()

  const foundPlan = await findPlanForMember(database, editingUser, foundTask.planId)

  if (updateRequest.milestoneId !== undefined && updateRequest.milestoneId !== null) {
    await assertMilestoneBelongsToPlan(database, foundPlan.plan.id, updateRequest.milestoneId)
  }
  if (updateRequest.assigneeUserId !== undefined && updateRequest.assigneeUserId !== null) {
    await assertAssigneeIsMember(database, foundPlan.plan.workspaceId, updateRequest.assigneeUserId)
  }

  const updatedAt = createIsoTimestamp()
  await database.batch(
    asBatchStatements([
      buildUpdateTaskStatement(database, taskId, { ...updateRequest, updatedAt }),
      buildInsertActivityEventStatement(database, {
        id: crypto.randomUUID(),
        workspaceId: foundPlan.plan.workspaceId,
        actorUserId: editingUser.id,
        eventType: 'task_updated',
        subjectType: 'plan',
        subjectId: foundPlan.plan.id,
        summaryText: `${editingUser.displayName} updated a task on “${foundPlan.plan.title}”`,
        createdAt: updatedAt,
      }),
    ]),
  )

  return { workspaceId: foundPlan.plan.workspaceId, planId: foundPlan.plan.id }
}

// ---- Validation helpers --------------------------------------------------------

/** Throws a 400 when the milestone is not part of the given plan. */
async function assertMilestoneBelongsToPlan(
  database: IdeoDatabase,
  planId: string,
  milestoneId: string,
): Promise<void> {
  const foundMilestone = await findMilestoneById(database, milestoneId)
  if (foundMilestone === null || foundMilestone.planId !== planId) {
    throw validationFailedError('That milestone does not belong to this plan.')
  }
}

/** Throws a 400 when the assignee is not a member of the workspace. */
async function assertAssigneeIsMember(
  database: IdeoDatabase,
  workspaceId: string,
  assigneeUserId: string,
): Promise<void> {
  const membership = await findWorkspaceMember(database, workspaceId, assigneeUserId)
  if (!membership) {
    throw validationFailedError('Assignees must be members of this workspace.')
  }
}
