-- =============================================================================
-- MIGRATION: 0002_idea_brainstorm_link.sql
-- PURPOSE: Links sparks (ideas) to the brainstorm session that produced them,
--          so anonymity can lift when the session ends and session pages can
--          list their sparks without tag or timing heuristics. Also adds the
--          sessions' created_at, which the initial schema omitted.
-- USED BY: `wrangler d1 migrations apply` (see docs/deployment.md)
--
-- Sparks are ordinary idea rows; the link is nullable and cleared (SET NULL)
-- if a session is ever deleted, so ideas outlive their session.
-- =============================================================================

ALTER TABLE ideas ADD COLUMN brainstorm_session_id TEXT REFERENCES brainstorm_sessions(id) ON DELETE SET NULL;

CREATE INDEX idx_ideas_brainstorm_session ON ideas (brainstorm_session_id);

ALTER TABLE brainstorm_sessions ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
