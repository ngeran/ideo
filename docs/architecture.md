# Architecture & free-tier review

Ideo runs entirely on Cloudflare's free tier. This document is the standing
review that keeps it there: what each resource costs, what the app does to
stay inside the limits, and where the deliberate trade-offs are.

## Topology

One Worker (`apps/worker`) serves everything:

- The built React SPA from static assets (`apps/web/dist`).
- The JSON API under `/api/*` (Hono routes → services → D1 queries).
- One WebSocket endpoint, `/ws/workspaces/:workspaceId/room`, forwarded to a
  per-workspace Durable Object.

Data lives in one D1 database (`ideo-database`). Realtime rooms live in
Durable Objects. No R2, Queues, orKV yet.

## Realtime (Phase 5)

- **Class type:** `WorkspaceRoom` is a single SQLite-backed Durable Object
  class (`new_sqlite_classes`), the free-tier storage type. One instance per
  workspace, addressed by `idFromName(workspaceId)`.
- **Hibernation:** connections use the WebSocket Hibernation API, so idle
  rooms cost nothing while teammates are just looking. Presence state rides
  in per-socket serialized attachments and survives hibernation.
- **Throttled presence:** clients heartbeat at most once per 45 s; the room
  treats entries with no heartbeat for 2 minutes as gone, and only broadcasts
  a presence snapshot when it actually changes (join, leave, view change) —
  heartbeats never fan out.
- **Tiny events, no payloads:** mutations broadcast only
  `{eventType, subjectId}`. Clients re-fetch the affected list/detail through
  their existing TanStack Query caches, so the socket never carries rows.
- **Broadcasts are best-effort:** routes notify the room under `waitUntil`
  after the response is sent; a realtime failure can never fail the mutation.
- **Membership gate:** the room trusts only the Worker, which resolves the
  identity and checks workspace membership (404 for non-members, same as the
  REST API) before any socket is created.

## Collaborative notes (Phase 7)

- **Class type:** `PlanDocumentRoom` is the second SQLite-backed Durable
  Object class (migration tag `v2`). One instance per plan, named by the plan
  id; it speaks the standard y-websocket wire protocol (sync + awareness
  binary frames) so any Yjs client can connect.
- **Storage:** the merged Yjs document persists to the object's own storage
  under one key, flushed on a 2-second debounce (and when the last editor
  disconnects) — no D1 row churn for keystrokes. Orphaned room storage after
  a plan deletion is accepted waste on the free tier.
- **Offline sync:** the browser mirrors the document to IndexedDB
  (y-indexeddb), so edits made offline merge through the CRDT when the socket
  returns.
- **Message validation note:** the definition of done asks for Zod validation
  on every WebSocket message. Notes frames are binary Yjs protocol messages,
  not JSON, so they cannot be Zod-validated; the equivalent guarantee is
  protocol decoding under strict guards — malformed frames are logged and
  dropped, never crash the room. The JSON socket (`WorkspaceRoom`) remains
  fully Zod-validated in both directions.
- **Membership gate:** identical to the REST API — the plan must exist and
  the caller must belong to its workspace (404 either way) before any socket
  is created.

## Brainstorm sessions (Phase 8)

- **Sparks are ideas:** a spark is an ordinary idea row linked to its session
  (`ideas.brainstorm_session_id`, migration 0002), so it appears on the board
  immediately and benefits from votes, comments, and ICE scoring for free.
- **Anonymous until the end:** sparks created in an anonymous session carry
  `is_anonymous = 1`; ending the session flips them back in one UPDATE — the
  reveal is a server transaction, not a client convention.
- **No per-second traffic:** the timer's start is the only server moment.
  `session_started` fixes `started_at`; every client counts down locally from
  `startedAt + durationSeconds`. Ending is manual (or when the countdown
  reaches zero, anyone can press End).
- **Spark prompts** are a static shared constant (`SPARK_PROMPTS`) — no AI
  cost, no network call.
- **Sessions list** is cursor-paginated like every other list; the workspace
  index covers the sort.

## D1

- Migrations in `apps/worker/migrations`; every filtered column is covered by
  an index (e.g. `idx_ideas_workspace_stage` on
  `ideas(workspace_id, stage, created_at DESC)`).
- Lists are cursor-paginated (keyset cursors, 30 per page, 100 max) so no
  request ever reads an unbounded set of rows.
- Per-request reads stay small: idea list = one indexed query + batched
  tag/vote/comment aggregates.

## Free-tier limits checked (2026-10)

| Resource | Free allowance | Ideo's usage pattern |
| --- | --- | --- |
| Worker requests | 100k/day | JSON API + assets; assets mostly served directly |
| D1 rows read/written | 5M read / 100k write per day | Paginated lists, indexed filters, small team volumes |
| Durable Objects (SQLite) | 100k requests/day, hibernation free | 1 room per workspace, wake only on events/heartbeats |
| WebSockets | Hibernating connections count only when active | Idle clients hibernate; 45 s heartbeat wakes 1/45 s ≈ 1.3 req/min per client |

Re-check these numbers against Cloudflare's current docs before relying on
them — limits change.
