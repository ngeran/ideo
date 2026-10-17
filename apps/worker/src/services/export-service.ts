// =============================================================================
// FILE:    apps/worker/src/services/export-service.ts
// PURPOSE: The one-click workspace export: gathers the workspace's members,
//          ideas, plans (with milestones and tasks), and brainstorm sessions,
//          then renders them as Markdown or JSON. Bound by page caps so one
//          request can never read the whole D1 allowance. Anonymity follows
//          the board's rules: anonymous ideas export without their authors.
// USED BY: routes/export-routes.ts
// =============================================================================

import type { PlanStatus, TaskStatus } from '@ideo/shared'
import { calculateIceScore, IDEA_STAGE_LABELS } from '@ideo/shared'
// ---- Imports ----------------------------------------------------------------
import type { UserRecord } from '../configuration/record-types'
import { listSessionsForWorkspace } from '../database/brainstorm-queries'
import type { IdeoDatabase } from '../database/create-database'
import { listIdeasForWorkspace } from '../database/idea-list-queries'
import {
  listMilestonesForPlan,
  listPlansForWorkspace,
  listTasksForPlan,
} from '../database/plan-queries'
import { findWorkspaceMember, listWorkspaceMembers } from '../database/workspace-member-queries'
import { findWorkspaceById } from '../database/workspace-queries'
import { workspaceAccessDeniedError } from '../routes/api-errors'

// ---- Types ------------------------------------------------------------------

/** The export formats the API serves. */
export type ExportFormat = 'markdown' | 'json'

/** One idea as the export carries it. */
export type IdeaExportRow = {
  title: string
  stage: string
  isAnonymous: boolean
  author: string | null
  tags: string[]
  iceScore: number | null
  voteCount: number
  commentCount: number
  createdAt: string
}

/** A workspace bundle as the JSON export delivers it. */
export type WorkspaceExportBundle = {
  exportedAt: string
  exportedBy: string
  workspace: { id: string; name: string }
  members: Array<{ displayName: string; role: string }>
  ideas: IdeaExportRow[]
  plans: Array<{
    title: string
    planStatus: PlanStatus
    summary: string
    milestones: Array<{ title: string; dueDate: string | null; isDone: boolean }>
    tasks: Array<{ title: string; taskStatus: TaskStatus; assignee: string | null }>
  }>
  sessions: Array<{
    topic: string
    startedAt: string | null
    endedAt: string | null
    isAnonymousUntilEnd: boolean
    sparkCount: number
  }>
}

// ---- Constants --------------------------------------------------------------

/** Hard page caps: exports stay useful without unbounded D1 reads. */
const MAX_IDEAS = 500
const MAX_PLANS = 100
const MAX_SESSIONS = 200
const PAGE_SIZE = 100

// ---- Gathering ------------------------------------------------------------------

/**
 * Collects every idea page up to the cap. Rows come straight from the board's
 * list query; anonymity (author visible only for your own anonymous ideas) is
 * decided here, the same way the board decides it.
 */
async function gatherIdeas(
  database: IdeoDatabase,
  workspaceId: string,
  readerUserId: string,
): Promise<IdeaExportRow[]> {
  const ideaExportRows: IdeaExportRow[] = []
  let cursor: string | undefined
  for (let pageIndex = 0; pageIndex < MAX_IDEAS / PAGE_SIZE; pageIndex += 1) {
    const ideaPage = await listIdeasForWorkspace(database, workspaceId, {
      stage: undefined,
      cursor,
      limit: PAGE_SIZE,
      sort: 'newest',
      currentUserId: readerUserId,
    })

    for (const ideaRow of ideaPage.rows) {
      const isAnonymousIdea = Number(ideaRow.idea.isAnonymous) === 1
      const isOwnIdea = ideaRow.idea.authorUserId === readerUserId
      ideaExportRows.push({
        title: ideaRow.idea.title,
        stage: ideaRow.idea.stage,
        isAnonymous: isAnonymousIdea,
        author: isAnonymousIdea && !isOwnIdea ? null : ideaRow.authorDisplayName,
        tags: [],
        iceScore: calculateIceScore({
          impactScore: ideaRow.idea.impactScore,
          confidenceScore: ideaRow.idea.confidenceScore,
          easeScore: ideaRow.idea.easeScore,
        }),
        voteCount: ideaRow.voteCount,
        commentCount: ideaRow.commentCount,
        createdAt: ideaRow.idea.createdAt,
      })
    }

    cursor = ideaPage.nextCursor ?? undefined
    if (cursor === undefined) break
  }
  return ideaExportRows
}

// ---- Bundle ---------------------------------------------------------------------

/**
 * Gathers the workspace bundle for a member.
 * Returns the structured bundle; rendering happens per format.
 */
export async function buildWorkspaceExportBundle(
  database: IdeoDatabase,
  requestingUser: UserRecord,
  workspaceId: string,
): Promise<WorkspaceExportBundle> {
  const foundWorkspace = await findWorkspaceById(database, workspaceId)
  if (!foundWorkspace) throw workspaceAccessDeniedError()

  const membership = await findWorkspaceMember(database, workspaceId, requestingUser.id)
  if (!membership) throw workspaceAccessDeniedError()

  const memberRows = await listWorkspaceMembers(database, workspaceId)
  const ideaRows = await gatherIdeas(database, workspaceId, requestingUser.id)

  // Plans, each with its milestones and tasks, up to the cap.
  const planRows: WorkspaceExportBundle['plans'] = []
  let planCursor: string | undefined
  for (
    let pageIndex = 0;
    pageIndex < MAX_PLANS / PAGE_SIZE && planRows.length < MAX_PLANS;
    pageIndex += 1
  ) {
    const planPage = await listPlansForWorkspace(database, workspaceId, {
      cursor: planCursor,
      limit: PAGE_SIZE,
    })
    for (const planRow of planPage.rows) {
      if (planRows.length >= MAX_PLANS) break
      const [milestones, tasks] = await Promise.all([
        listMilestonesForPlan(database, planRow.plan.id),
        listTasksForPlan(database, planRow.plan.id),
      ])
      planRows.push({
        title: planRow.plan.title,
        planStatus: planRow.plan.planStatus as PlanStatus,
        summary: planRow.plan.summary,
        milestones: milestones.map((milestone) => ({
          title: milestone.title,
          dueDate: milestone.dueDate,
          isDone: milestone.isDone === 1,
        })),
        tasks: tasks.map((taskRow) => ({
          title: taskRow.task.title,
          taskStatus: taskRow.task.taskStatus as TaskStatus,
          assignee: taskRow.assigneeDisplayName,
        })),
      })
    }
    planCursor = planPage.nextCursor ?? undefined
    if (planCursor === undefined) break
  }

  // Sessions, up to the cap.
  const sessionRows: WorkspaceExportBundle['sessions'] = []
  let sessionCursor: string | undefined
  for (
    let pageIndex = 0;
    pageIndex < MAX_SESSIONS / PAGE_SIZE && sessionRows.length < MAX_SESSIONS;
    pageIndex += 1
  ) {
    const sessionPage = await listSessionsForWorkspace(database, workspaceId, {
      cursor: sessionCursor,
      limit: PAGE_SIZE,
    })
    for (const sessionRow of sessionPage.rows) {
      if (sessionRows.length >= MAX_SESSIONS) break
      sessionRows.push({
        topic: sessionRow.session.topic,
        startedAt: sessionRow.session.startedAt,
        endedAt: sessionRow.session.endedAt,
        isAnonymousUntilEnd: Number(sessionRow.session.isAnonymousUntilEnd) === 1,
        sparkCount: sessionRow.sparkCount,
      })
    }
    sessionCursor = sessionPage.nextCursor ?? undefined
    if (sessionCursor === undefined) break
  }

  return {
    exportedAt: new Date().toISOString(),
    exportedBy: requestingUser.displayName,
    workspace: { id: foundWorkspace.id, name: foundWorkspace.name },
    members: memberRows.map((memberRow) => ({
      displayName: memberRow.displayName,
      role: memberRow.memberRole,
    })),
    ideas: ideaRows,
    plans: planRows,
    sessions: sessionRows,
  }
}

// ---- Rendering ------------------------------------------------------------------

/** Renders the bundle as a human-readable Markdown document. */
export function renderBundleAsMarkdown(bundle: WorkspaceExportBundle): string {
  const markdownLines: string[] = []
  markdownLines.push(`# Ideo export — ${bundle.workspace.name}`)
  markdownLines.push('')
  markdownLines.push(`Exported ${bundle.exportedAt} by ${bundle.exportedBy}.`)
  markdownLines.push('')

  markdownLines.push('## Members')
  for (const bundleMember of bundle.members) {
    markdownLines.push(`- ${bundleMember.displayName} (${bundleMember.role})`)
  }
  markdownLines.push('')

  markdownLines.push(`## Ideas (${bundle.ideas.length})`)
  for (const bundleIdea of bundle.ideas) {
    markdownLines.push(`### ${bundleIdea.title}`)
    markdownLines.push(
      `- Stage: ${IDEA_STAGE_LABELS[bundleIdea.stage as keyof typeof IDEA_STAGE_LABELS] ?? bundleIdea.stage}`,
    )
    markdownLines.push(
      `- Author: ${bundleIdea.isAnonymous && bundleIdea.author === null ? 'anonymous' : (bundleIdea.author ?? 'unknown')}`,
    )
    if (bundleIdea.tags.length > 0) markdownLines.push(`- Tags: ${bundleIdea.tags.join(', ')}`)
    if (bundleIdea.iceScore !== null) markdownLines.push(`- ICE score: ${bundleIdea.iceScore}`)
    markdownLines.push(`- ${bundleIdea.voteCount} votes · ${bundleIdea.commentCount} comments`)
    markdownLines.push('')
  }

  markdownLines.push(`## Plans (${bundle.plans.length})`)
  for (const bundlePlan of bundle.plans) {
    markdownLines.push(`### ${bundlePlan.title} (${bundlePlan.planStatus})`)
    if (bundlePlan.summary) markdownLines.push(bundlePlan.summary)
    for (const bundleMilestone of bundlePlan.milestones) {
      markdownLines.push(
        `- ◆ ${bundleMilestone.title}${bundleMilestone.dueDate ? ` (due ${bundleMilestone.dueDate})` : ''}${bundleMilestone.isDone ? ' ✓' : ''}`,
      )
    }
    for (const bundleTask of bundlePlan.tasks) {
      markdownLines.push(
        `- [${bundleTask.taskStatus === 'done' ? 'x' : ' '}] ${bundleTask.title}${bundleTask.assignee ? ` — ${bundleTask.assignee}` : ''}`,
      )
    }
    markdownLines.push('')
  }

  markdownLines.push(`## Brainstorm sessions (${bundle.sessions.length})`)
  for (const bundleSession of bundle.sessions) {
    const sessionState =
      bundleSession.endedAt !== null
        ? 'ended'
        : bundleSession.startedAt !== null
          ? 'ran'
          : 'scheduled'
    markdownLines.push(
      `- ${bundleSession.topic} — ${sessionState}, ${bundleSession.sparkCount} sparks${bundleSession.isAnonymousUntilEnd ? ' (was anonymous until end)' : ''}`,
    )
  }

  return `${markdownLines.join('\n')}\n`
}

/** Renders the bundle as pretty-printed JSON. */
export function renderBundleAsJson(bundle: WorkspaceExportBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`
}
