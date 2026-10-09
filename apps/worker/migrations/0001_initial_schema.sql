-- =============================================================================
-- FILE:    apps/worker/migrations/0001_initial_schema.sql
-- PURPOSE: Full initial schema for Ideo: users, workspaces, invites, ideas,
--          votes, comments, plans, milestones, tasks, brainstorm sessions,
--          and the activity feed.
-- USED BY: `wrangler d1 migrations apply` (see docs/deployment.md)
--
-- Conventions:
--   * Text UUIDs generated with crypto.randomUUID() in the Worker.
--   * ISO-8601 text timestamps (UTC), so they sort correctly as strings.
--   * An index for every column used in WHERE / ORDER BY, because the free
--     D1 tier charges by rows read — full scans are the enemy.
-- =============================================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  member_role TEXT NOT NULL CHECK (member_role IN ('owner', 'member')),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);

-- Lookup in the other direction: "which workspaces does this user belong to".
CREATE INDEX idx_workspace_members_user ON workspace_members (user_id);

CREATE TABLE workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  maximum_uses INTEGER NOT NULL,
  times_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Listing a workspace's active invites, newest first.
CREATE INDEX idx_workspace_invites_workspace ON workspace_invites (workspace_id, created_at DESC);

CREATE TABLE ideas (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id),
  is_anonymous INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL CHECK (stage IN ('spark','shaping','validated','planned','launched')),
  impact_score INTEGER CHECK (impact_score BETWEEN 1 AND 10),
  confidence_score INTEGER CHECK (confidence_score BETWEEN 1 AND 10),
  ease_score INTEGER CHECK (ease_score BETWEEN 1 AND 10),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_ideas_workspace_stage ON ideas (workspace_id, stage, created_at DESC);

CREATE TABLE idea_tags (
  idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  tag_label TEXT NOT NULL,
  PRIMARY KEY (idea_id, tag_label)
);

-- Lookup in the other direction: "which ideas has this user voted on" (used to
-- render the voted state on the board without a per-idea query).
CREATE INDEX idx_idea_votes_user ON idea_votes (user_id);

CREATE TABLE idea_votes (
  idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (idea_id, user_id)
);

CREATE TABLE idea_comments (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL REFERENCES users(id),
  comment_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_idea_comments_idea ON idea_comments (idea_id, created_at);

CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_idea_id TEXT REFERENCES ideas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  plan_status TEXT NOT NULL CHECK (plan_status IN ('draft','active','done')),
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_plans_workspace ON plans (workspace_id, plan_status);

CREATE TABLE plan_milestones (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TEXT,
  is_done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL
);
CREATE INDEX idx_plan_milestones_plan ON plan_milestones (plan_id, sort_order);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  milestone_id TEXT REFERENCES plan_milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  task_status TEXT NOT NULL CHECK (task_status IN ('todo','doing','done')),
  assignee_user_id TEXT REFERENCES users(id),
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_tasks_plan_status ON tasks (plan_id, task_status, sort_order);

CREATE TABLE brainstorm_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  is_anonymous_until_end INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  ended_at TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id)
);
CREATE INDEX idx_brainstorm_sessions_workspace ON brainstorm_sessions (workspace_id, created_at DESC);

CREATE TABLE activity_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  event_type TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_activity_workspace_time ON activity_events (workspace_id, created_at DESC);
