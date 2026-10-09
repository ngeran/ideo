// =============================================================================
// FILE:    apps/worker/src/database/drizzle-schema.ts
// PURPOSE: Drizzle table definitions mirroring migrations/0001_initial_schema.sql
//          exactly (same tables, columns, and snake_case SQL names). Queries in
//          database/*-queries.ts are built from these.
// USED BY: create-database.ts, all database query files
// =============================================================================

// ---- Imports ----------------------------------------------------------------
import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// ---- Tables -----------------------------------------------------------------

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarColor: text('avatar_color').notNull(),
  createdAt: text('created_at').notNull(),
})

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdByUserId: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at').notNull(),
})

export const workspaceMembers = sqliteTable(
  'workspace_members',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    memberRole: text('member_role').notNull(), // 'owner' | 'member' — CHECK in SQL
    joinedAt: text('joined_at').notNull(),
  },
  (membersTable) => [primaryKey({ columns: [membersTable.workspaceId, membersTable.userId] })],
)

export const workspaceInvites = sqliteTable('workspace_invites', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  inviteCode: text('invite_code').notNull().unique(),
  createdByUserId: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: text('expires_at').notNull(),
  maximumUses: integer('maximum_uses').notNull(),
  timesUsed: integer('times_used').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

export const ideas = sqliteTable('ideas', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  authorUserId: text('author_user_id')
    .notNull()
    .references(() => users.id),
  isAnonymous: integer('is_anonymous').notNull().default(0),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  stage: text('stage').notNull(), // pipeline stage — CHECK in SQL
  impactScore: integer('impact_score'),
  confidenceScore: integer('confidence_score'),
  easeScore: integer('ease_score'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const ideaTags = sqliteTable(
  'idea_tags',
  {
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    tagLabel: text('tag_label').notNull(),
  },
  (tagsTable) => [primaryKey({ columns: [tagsTable.ideaId, tagsTable.tagLabel] })],
)

export const ideaVotes = sqliteTable(
  'idea_votes',
  {
    ideaId: text('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    createdAt: text('created_at').notNull(),
  },
  (votesTable) => [primaryKey({ columns: [votesTable.ideaId, votesTable.userId] })],
)

export const ideaComments = sqliteTable('idea_comments', {
  id: text('id').primaryKey(),
  ideaId: text('idea_id')
    .notNull()
    .references(() => ideas.id, { onDelete: 'cascade' }),
  authorUserId: text('author_user_id')
    .notNull()
    .references(() => users.id),
  commentText: text('comment_text').notNull(),
  createdAt: text('created_at').notNull(),
})

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  sourceIdeaId: text('source_idea_id').references(() => ideas.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  planStatus: text('plan_status').notNull(), // 'draft' | 'active' | 'done' — CHECK in SQL
  createdByUserId: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const planMilestones = sqliteTable('plan_milestones', {
  id: text('id').primaryKey(),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  dueDate: text('due_date'),
  isDone: integer('is_done').notNull().default(0),
  sortOrder: integer('sort_order').notNull(),
})

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  planId: text('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  milestoneId: text('milestone_id').references(() => planMilestones.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  taskStatus: text('task_status').notNull(), // 'todo' | 'doing' | 'done' — CHECK in SQL
  assigneeUserId: text('assignee_user_id').references(() => users.id),
  sortOrder: integer('sort_order').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const brainstormSessions = sqliteTable('brainstorm_sessions', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  topic: text('topic').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  isAnonymousUntilEnd: integer('is_anonymous_until_end').notNull().default(0),
  startedAt: text('started_at'),
  endedAt: text('ended_at'),
  createdByUserId: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
})

export const activityEvents = sqliteTable('activity_events', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  actorUserId: text('actor_user_id')
    .notNull()
    .references(() => users.id),
  eventType: text('event_type').notNull(),
  subjectType: text('subject_type').notNull(),
  subjectId: text('subject_id').notNull(),
  summaryText: text('summary_text').notNull(),
  createdAt: text('created_at').notNull(),
})
