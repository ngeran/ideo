// =============================================================================
// FILE:    apps/worker/src/database/plan-queries.ts
// PURPOSE: SQL for plans, milestones, and tasks: find, create, update, and
//          the paginated workspace plan list. Business rules live in the plan
//          service; this file only talks to D1.
// USED BY: services/plan-service.ts
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { and, asc, eq, lt, or, sql } from 'drizzle-orm'
import type { PlanRecord, TaskRecord } from '../configuration/record-types'
import type { IdeoDatabase } from './create-database'
import { planMilestones, plans, tasks, users } from './drizzle-schema'

// ---- Types ------------------------------------------------------------------

/** Fields for inserting a new plan. */
export type NewPlanInput = {
  id: string
  workspaceId: string
  sourceIdeaId: string | null
  title: string
  summary: string
  planStatus: string
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

/** Fields for inserting a new milestone. */
export type NewMilestoneInput = {
  id: string
  planId: string
  title: string
  dueDate: string | null
  isDone: number
  sortOrder: number
}

/** Fields for inserting a new task. */
export type NewTaskInput = {
  id: string
  planId: string
  milestoneId: string | null
  title: string
  taskStatus: string
  assigneeUserId: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** One plan row joined with its creator and task counters. */
export type PlanListRow = {
  plan: PlanRecord
  creatorDisplayName: string
  creatorAvatarColor: string
  taskTotal: number
  taskDoneCount: number
}

// ---- Finds ------------------------------------------------------------------

/** Fetches one plan row, or null when absent. */
export async function findPlanById(
  database: IdeoDatabase,
  planId: string,
): Promise<PlanRecord | null> {
  const foundPlans = await database.select().from(plans).where(eq(plans.id, planId)).limit(1)
  return foundPlans[0] ?? null
}

/** Fetches one plan joined with its creator's display fields, or null. */
export async function findPlanByIdWithCreator(
  database: IdeoDatabase,
  planId: string,
): Promise<{ plan: PlanRecord; creatorDisplayName: string; creatorAvatarColor: string } | null> {
  const foundPlans = await database
    .select({
      plan: plans,
      creatorDisplayName: users.displayName,
      creatorAvatarColor: users.avatarColor,
    })
    .from(plans)
    .innerJoin(users, eq(users.id, plans.createdByUserId))
    .where(eq(plans.id, planId))
    .limit(1)
  return foundPlans[0] ?? null
}

/** Fetches one task row, or null when absent. */
export async function findTaskById(
  database: IdeoDatabase,
  taskId: string,
): Promise<TaskRecord | null> {
  const foundTasks = await database.select().from(tasks).where(eq(tasks.id, taskId)).limit(1)
  return foundTasks[0] ?? null
}

/** Fetches one milestone row, or null when absent (task re-bucketing checks). */
export async function findMilestoneById(
  database: IdeoDatabase,
  milestoneId: string,
): Promise<{ id: string; planId: string } | null> {
  const foundMilestones = await database
    .select({ id: planMilestones.id, planId: planMilestones.planId })
    .from(planMilestones)
    .where(eq(planMilestones.id, milestoneId))
    .limit(1)
  return foundMilestones[0] ?? null
}

// ---- Statements (for D1 batches) ---------------------------------------------

/** Builds the insert for a new plan (un-awaited, for batches). */
export function buildInsertPlanStatement(database: IdeoDatabase, newPlan: NewPlanInput) {
  return database.insert(plans).values(newPlan)
}

/** Builds the insert for one milestone (un-awaited, for batches). */
export function buildInsertMilestoneStatement(
  database: IdeoDatabase,
  newMilestone: NewMilestoneInput,
) {
  return database.insert(planMilestones).values(newMilestone)
}

/** Builds the insert for one task (un-awaited, for batches). */
export function buildInsertTaskStatement(database: IdeoDatabase, newTask: NewTaskInput) {
  return database.insert(tasks).values(newTask)
}

/** Builds the update for editable plan fields (un-awaited, for batches). */
export function buildUpdatePlanStatement(
  database: IdeoDatabase,
  planId: string,
  updatedFields: Partial<{ title: string; summary: string; planStatus: string; updatedAt: string }>,
) {
  return database.update(plans).set(updatedFields).where(eq(plans.id, planId))
}

/** Builds the update for editable task fields (un-awaited, for batches). */
export function buildUpdateTaskStatement(
  database: IdeoDatabase,
  taskId: string,
  updatedFields: Partial<{
    title: string
    taskStatus: string
    assigneeUserId: string | null
    milestoneId: string | null
    sortOrder: number
    updatedAt: string
  }>,
) {
  return database.update(tasks).set(updatedFields).where(eq(tasks.id, taskId))
}

// ---- Reads ------------------------------------------------------------------

/** Fetches a plan's milestones, board order. */
export async function listMilestonesForPlan(database: IdeoDatabase, planId: string) {
  return database
    .select()
    .from(planMilestones)
    .where(eq(planMilestones.planId, planId))
    .orderBy(asc(planMilestones.sortOrder))
}

/** Fetches a plan's tasks with assignee names, board order inside each status. */
export async function listTasksForPlan(database: IdeoDatabase, planId: string) {
  return database
    .select({
      task: tasks,
      assigneeDisplayName: users.displayName,
      assigneeAvatarColor: users.avatarColor,
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeUserId))
    .where(eq(tasks.planId, planId))
    .orderBy(asc(tasks.sortOrder), asc(tasks.createdAt))
}

/**
 * Lists one page of a workspace's plans, newest first, with creator names and
 * live task counters. Pagination is mandatory on the D1 free tier.
 * Returns the page's rows and the cursor for the next page (null when done).
 */
export async function listPlansForWorkspace(
  database: IdeoDatabase,
  workspaceId: string,
  listOptions: { cursor: string | undefined; limit: number },
): Promise<{ rows: PlanListRow[]; nextCursor: string | null }> {
  const fetchLimit = listOptions.limit + 1 // one extra row detects "there is more"

  const conditions = [eq(plans.workspaceId, workspaceId)]
  const decodedCursor = decodePlanListCursor(listOptions.cursor)
  if (decodedCursor !== null) {
    conditions.push(
      or(
        lt(plans.createdAt, decodedCursor.lastCreatedAt),
        and(
          eq(plans.createdAt, decodedCursor.lastCreatedAt),
          lt(plans.id, decodedCursor.lastPlanId),
        ),
      ) ?? sql`1 = 0`,
    )
  }

  const listRows = await database
    .select({
      plan: plans,
      creatorDisplayName: users.displayName,
      creatorAvatarColor: users.avatarColor,
      taskTotal: sql<number>`(select count(*) from ${tasks} where ${tasks.planId} = ${plans.id})`,
      taskDoneCount: sql<number>`(select count(*) from ${tasks} where ${tasks.planId} = ${plans.id} and ${tasks.taskStatus} = 'done')`,
    })
    .from(plans)
    .innerJoin(users, eq(users.id, plans.createdByUserId))
    .where(and(...conditions))
    .orderBy(sql`${plans.createdAt} desc`, sql`${plans.id} desc`)
    .limit(fetchLimit)

  const hasMoreRows = listRows.length > listOptions.limit
  const pageRows = hasMoreRows ? listRows.slice(0, listOptions.limit) : listRows
  const lastRow = pageRows.at(-1)

  return {
    rows: pageRows.map((listRow) => ({
      ...listRow,
      taskTotal: Number(listRow.taskTotal),
      taskDoneCount: Number(listRow.taskDoneCount),
    })),
    nextCursor:
      hasMoreRows && lastRow !== undefined
        ? encodePlanListCursor(lastRow.plan.createdAt, lastRow.plan.id)
        : null,
  }
}

// ---- Plan list cursor ---------------------------------------------------------

/**
 * Encodes the plan list's keyset cursor. Same opaque pattern as the idea
 * list's; the format is server-private.
 */
export function encodePlanListCursor(lastCreatedAt: string, lastPlanId: string): string {
  return Buffer.from(JSON.stringify({ t: lastCreatedAt, i: lastPlanId }), 'utf8').toString(
    'base64url',
  )
}

/**
 * Decodes a client-echoed plan list cursor.
 * Returns the parsed boundary, or null when absent or malformed.
 */
export function decodePlanListCursor(
  cursorText: string | undefined,
): { lastCreatedAt: string; lastPlanId: string } | null {
  if (cursorText === undefined) return null

  try {
    const parsedRecord = JSON.parse(
      Buffer.from(cursorText, 'base64url').toString('utf8'),
    ) as Record<string, unknown>
    const isWellFormed = typeof parsedRecord.t === 'string' && typeof parsedRecord.i === 'string'
    return isWellFormed
      ? { lastCreatedAt: parsedRecord.t as string, lastPlanId: parsedRecord.i as string }
      : null
  } catch {
    return null
  }
}
