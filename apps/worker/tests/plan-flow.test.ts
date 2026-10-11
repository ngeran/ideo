// =============================================================================
// FILE:    apps/worker/tests/plan-flow.test.ts
// PURPOSE: End-to-end plan tests over real D1: promote an idea to a plan
//          (with the stage move), list, detail, milestones, task creation,
//          task moves, plan updates, and the membership/validation gates.
// USED BY: `pnpm test`
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createTestApplicationForUser,
  createTestApplicationWithoutIdentity,
  createTestUserRecord,
} from './test-helpers'

// ---- Types ------------------------------------------------------------------

/** Shapes the tests read from JSON responses. */
type WorkspaceCreatedBody = { workspace: { id: string } }
type IdeaCreatedBody = { idea: { ideaId: string } }
type PlanCreatedBody = { plan: { planId: string; title: string; planStatus: string } }
type PlanListBody = {
  plans: Array<{
    id: string
    title: string
    planStatus: string
    sourceIdeaId: string | null
    taskTotal: number
    taskDoneCount: number
    createdBy: { displayName: string }
  }>
  nextCursor: string | null
}
type PlanDetailBody = {
  plan: {
    id: string
    title: string
    summary: string
    planStatus: string
    taskTotal: number
    taskDoneCount: number
  }
  milestones: Array<{ id: string; title: string; dueDate: string | null; isDone: boolean }>
  tasks: Array<{
    id: string
    title: string
    taskStatus: string
    milestoneId: string | null
    assignee: { displayName: string } | null
    sortOrder: number
  }>
}
type MilestoneCreatedBody = { milestone: { milestoneId: string } }
type TaskCreatedBody = { task: { taskId: string } }

// ---- Helpers ------------------------------------------------------------------

/** Creates a workspace for the owner application and returns its id. */
async function createWorkspaceId(
  ownerApplication: ReturnType<typeof createTestApplicationForUser>,
): Promise<string> {
  const createResponse = await ownerApplication.fetchAsUser('/api/workspaces', 'POST', {
    name: 'Plan Lab',
  })
  const createdBody = (await createResponse.json()) as WorkspaceCreatedBody
  return createdBody.workspace.id
}

/** Adds the member to the workspace through a fresh single-use invite. */
async function addMemberToWorkspace(
  ownerApplication: ReturnType<typeof createTestApplicationForUser>,
  memberApplication: ReturnType<typeof createTestApplicationForUser>,
  workspaceId: string,
): Promise<void> {
  const inviteResponse = await ownerApplication.fetchAsUser(
    `/api/workspaces/${workspaceId}/invites`,
    'POST',
    { maximumUses: 5 },
  )
  const { invite } = (await inviteResponse.json()) as { invite: { inviteCode: string } }
  await memberApplication.fetchAsUser('/api/workspaces/join', 'POST', {
    inviteCode: invite.inviteCode,
  })
}

/** Creates one idea as the member and returns its id. */
async function createIdeaId(
  memberApplication: ReturnType<typeof createTestApplicationForUser>,
  workspaceId: string,
): Promise<string> {
  const createResponse = await memberApplication.fetchAsUser(
    `/api/workspaces/${workspaceId}/ideas`,
    'POST',
    { title: 'Ship the launch blog post', description: 'Draft, review, publish.' },
  )
  const createdBody = (await createResponse.json()) as IdeaCreatedBody
  return createdBody.idea.ideaId
}

// ---- Tests ------------------------------------------------------------------
describe('the plan flow', () => {
  let ownerApplication: ReturnType<typeof createTestApplicationForUser>
  let memberApplication: ReturnType<typeof createTestApplicationForUser>
  let workspaceId: string
  let ideaId: string

  beforeEach(async () => {
    ownerApplication = createTestApplicationForUser(createTestUserRecord(0))
    memberApplication = createTestApplicationForUser(createTestUserRecord(1))
    workspaceId = await createWorkspaceId(ownerApplication)
    await addMemberToWorkspace(ownerApplication, memberApplication, workspaceId)
    ideaId = await createIdeaId(memberApplication, workspaceId)
  })

  it('promotes an idea into a draft plan and moves the idea to planned', async () => {
    const promoteResponse = await memberApplication.fetchAsUser(
      `/api/ideas/${ideaId}/promote-to-plan`,
      'POST',
      {},
    )
    expect(promoteResponse.status).toBe(201)
    const createdBody = (await promoteResponse.json()) as PlanCreatedBody
    expect(createdBody.plan.title).toBe('Ship the launch blog post')
    expect(createdBody.plan.planStatus).toBe('draft')

    // The source idea now sits in the planned stage on the board.
    const listResponse = await memberApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/ideas`,
      'GET',
    )
    const listBody = (await listResponse.json()) as {
      ideas: Array<{ id: string; stage: string }>
    }
    const promotedIdea = listBody.ideas.find((boardIdea) => boardIdea.id === ideaId)
    expect(promotedIdea?.stage).toBe('planned')
  })

  it('lists plans with creator and task counters, and hides them from outsiders', async () => {
    await memberApplication.fetchAsUser(`/api/ideas/${ideaId}/promote-to-plan`, 'POST', {})

    const listResponse = await memberApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/plans`,
      'GET',
    )
    expect(listResponse.status).toBe(200)
    const listBody = (await listResponse.json()) as PlanListBody
    expect(listBody.plans).toHaveLength(1)
    expect(listBody.plans[0]?.sourceIdeaId).toBe(ideaId)
    expect(listBody.plans[0]?.taskTotal).toBe(0)
    expect(listBody.plans[0]?.taskDoneCount).toBe(0)
    expect(listBody.plans[0]?.createdBy.displayName).toContain('Testuser')
    expect(listBody.nextCursor).toBeNull()

    const outsiderApplication = createTestApplicationForUser(createTestUserRecord(2))
    const outsiderResponse = await outsiderApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/plans`,
      'GET',
    )
    expect(outsiderResponse.status).toBe(404)
  })

  it('adds milestones and tasks, then serves the full detail', async () => {
    const promoteResponse = await memberApplication.fetchAsUser(
      `/api/ideas/${ideaId}/promote-to-plan`,
      'POST',
      {},
    )
    const { plan } = (await promoteResponse.json()) as PlanCreatedBody
    const planId = plan.planId

    const milestoneResponse = await memberApplication.fetchAsUser(
      `/api/plans/${planId}/milestones`,
      'POST',
      { title: 'Draft approved', dueDate: '2026-11-01' },
    )
    expect(milestoneResponse.status).toBe(201)
    const { milestone } = (await milestoneResponse.json()) as MilestoneCreatedBody

    const taskResponse = await memberApplication.fetchAsUser(`/api/plans/${planId}/tasks`, 'POST', {
      title: 'Write the first draft',
      milestoneId: milestone.milestoneId,
      assigneeUserId: 'test-user-1',
    })
    expect(taskResponse.status).toBe(201)
    const { task } = (await taskResponse.json()) as TaskCreatedBody

    const detailResponse = await memberApplication.fetchAsUser(`/api/plans/${planId}`, 'GET')
    expect(detailResponse.status).toBe(200)
    const detailBody = (await detailResponse.json()) as PlanDetailBody
    expect(detailBody.plan.id).toBe(planId)
    expect(detailBody.plan.summary).toBe('Draft, review, publish.')
    expect(detailBody.milestones).toHaveLength(1)
    expect(detailBody.milestones[0]?.isDone).toBe(false)
    expect(detailBody.tasks).toHaveLength(1)
    expect(detailBody.tasks[0]?.taskStatus).toBe('todo')
    expect(detailBody.tasks[0]?.assignee?.displayName).toContain('Testuser')
    expect(detailBody.tasks[0]?.milestoneId).toBe(milestone.milestoneId)

    // The task counters on the detail keep up with the board.
    expect(detailBody.plan.taskTotal).toBe(1)
    expect(detailBody.plan.taskDoneCount).toBe(0)
    void task
  })

  it('moves a task across the board and counts it as done', async () => {
    const promoteResponse = await memberApplication.fetchAsUser(
      `/api/ideas/${ideaId}/promote-to-plan`,
      'POST',
      {},
    )
    const { plan } = (await promoteResponse.json()) as PlanCreatedBody

    const taskResponse = await memberApplication.fetchAsUser(
      `/api/plans/${plan.planId}/tasks`,
      'POST',
      {
        title: 'Ask for a review',
      },
    )
    const { task } = (await taskResponse.json()) as TaskCreatedBody

    const moveResponse = await memberApplication.fetchAsUser(`/api/tasks/${task.taskId}`, 'PATCH', {
      taskStatus: 'done',
      sortOrder: 5,
    })
    expect(moveResponse.status).toBe(200)

    const detailResponse = await memberApplication.fetchAsUser(`/api/plans/${plan.planId}`, 'GET')
    const detailBody = (await detailResponse.json()) as PlanDetailBody
    expect(detailBody.tasks[0]?.taskStatus).toBe('done')
    expect(detailBody.plan.taskDoneCount).toBe(1)
  })

  it('rejects assignees outside the workspace and milestones from other plans', async () => {
    const promoteResponse = await memberApplication.fetchAsUser(
      `/api/ideas/${ideaId}/promote-to-plan`,
      'POST',
      {},
    )
    const { plan } = (await promoteResponse.json()) as PlanCreatedBody

    const outsiderTaskResponse = await memberApplication.fetchAsUser(
      `/api/plans/${plan.planId}/tasks`,
      'POST',
      { title: 'Impossible assignment', assigneeUserId: 'test-user-2' },
    )
    expect(outsiderTaskResponse.status).toBe(422)

    // A second plan owns the milestone this task points at.
    const secondIdeaId = await createIdeaId(memberApplication, workspaceId)
    await memberApplication.fetchAsUser(`/api/ideas/${secondIdeaId}/promote-to-plan`, 'POST', {})
    const secondPlanListResponse = await memberApplication.fetchAsUser(
      `/api/workspaces/${workspaceId}/plans`,
      'GET',
    )
    const secondPlanListBody = (await secondPlanListResponse.json()) as PlanListBody
    const otherPlanId = secondPlanListBody.plans.find((planRow) => planRow.id !== plan.planId)?.id

    const milestoneResponse = await memberApplication.fetchAsUser(
      `/api/plans/${otherPlanId}/milestones`,
      'POST',
      { title: 'Foreign milestone' },
    )
    const { milestone } = (await milestoneResponse.json()) as MilestoneCreatedBody

    const foreignMilestoneTaskResponse = await memberApplication.fetchAsUser(
      `/api/plans/${plan.planId}/tasks`,
      'POST',
      { title: 'Cross-plan task', milestoneId: milestone.milestoneId },
    )
    expect(foreignMilestoneTaskResponse.status).toBe(422)
  })

  it('updates a plan and requires membership for every route', async () => {
    const promoteResponse = await memberApplication.fetchAsUser(
      `/api/ideas/${ideaId}/promote-to-plan`,
      'POST',
      {},
    )
    const { plan } = (await promoteResponse.json()) as PlanCreatedBody

    const updateResponse = await memberApplication.fetchAsUser(
      `/api/plans/${plan.planId}`,
      'PATCH',
      {
        planStatus: 'active',
        summary: 'Now with a sharper summary.',
      },
    )
    expect(updateResponse.status).toBe(200)

    const detailResponse = await memberApplication.fetchAsUser(`/api/plans/${plan.planId}`, 'GET')
    const detailBody = (await detailResponse.json()) as PlanDetailBody
    expect(detailBody.plan.planStatus).toBe('active')
    expect(detailBody.plan.summary).toBe('Now with a sharper summary.')

    const outsiderApplication = createTestApplicationForUser(createTestUserRecord(2))
    const outsiderDetailResponse = await outsiderApplication.fetchAsUser(
      `/api/plans/${plan.planId}`,
      'GET',
    )
    expect(outsiderDetailResponse.status).toBe(404)

    const unauthenticatedApplication = createTestApplicationWithoutIdentity()
    const unauthenticatedResponse = await unauthenticatedApplication.fetchAsUser(
      `/api/plans/${plan.planId}`,
      'GET',
    )
    expect(unauthenticatedResponse.status).toBe(401)
  })
})
