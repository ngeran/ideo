---
name: ideo-app-builder
description: Build, extend, validate, and deploy Ideo — a private team workspace where a small group exchanges ideas, brainstorms, collaborates live, and turns ideas into plans and tasks. Runs on Cloudflare's free tier (one Worker serving the React app plus API, D1 database, Durable Objects for realtime, optional R2) and deploys from GitHub on every push. Use this skill whenever the user mentions Ideo, a private brainstorming or idea-board app, a team planning or collaboration app, realtime collaboration on Cloudflare Workers/D1/Durable Objects, or asks to scaffold, add a feature to, fix, review, or deploy any part of this app — even if they do not say "Ideo" explicitly.
---

# Ideo App Builder

Ideo is a **private space for a team to exchange ideas, brainstorm, collaborate, and turn ideas into real plans**. This skill tells you what to build, how to structure it, and how to check your own work.

Read this whole file before writing code. Follow the rules in "Non-negotiable rules" on every file you create.

---

## 1. Product vision (build for this, not for a generic CRUD app)

Ideo's core loop is the **Idea-to-Reality pipeline**:

```
Spark  →  Shaping  →  Validated  →  Planned  →  Launched
(raw)     (discussed)  (scored)      (has plan)   (done)
```

Everything in the UI should make it obvious where an idea is in this pipeline and what the next step is.

### Foundation feature set (build all of these)

| Feature | What it does |
|---|---|
| **Workspaces + invites** | A private team space. People join only through an invite link or code. |
| **Idea board** | Cards with title, description, tags, stage, vote count, and who is looking right now. |
| **Voting + comments** | One vote per person per idea; threaded-free comments; live updates for everyone. |
| **ICE scoring** | Impact, Confidence, Ease (1–10 each) produce a score used to rank validated ideas. |
| **Promote to plan** | One button turns an idea into a plan and moves it to stage `planned`. |
| **Plans** | Summary, milestones with due dates, and a collaborative notes document. |
| **Task board** | To do / Doing / Done columns, assignee, drag to reorder. |
| **Brainstorm sessions** | A timeboxed live session (default 10 min): shared countdown, presence, optional anonymous submissions until the timer ends. |
| **Spark prompts** | A built-in list of brainstorming prompts ("What would make this 10x cheaper?") shown in sessions and on empty states. Static data, no AI cost. |
| **Activity feed** | Who did what, newest first, updated live. |
| **Presence** | Avatars of who is online and which view they are on. |
| **Light/dark theme** | Light, dark, and "follow system", remembered per device. |
| **PWA** | Installable on Android and iOS, works offline for reading, and queues edits to plan notes. |
| **Export** | One click exports the workspace to Markdown/JSON, so the team is never locked in. |

Creative extras are welcome if they stay inside the free tier and the naming/structure rules. Put new ideas in `docs/ideas-backlog.md` rather than half-building them.

---

## 2. Non-negotiable rules

### 2.1 Naming — a stranger must understand the code in one read
- Names say **what a thing is or does**, in full words. No abbreviations except universally known ones (`id`, `url`, `api`).
- Functions start with a verb: `createIdea`, `listIdeasForWorkspace`, `castVoteOnIdea`, `calculateIceScore`.
- Booleans start with `is`, `has`, `can`, or `should`: `isVoteCastByCurrentUser`, `hasWorkspaceAccess`.
- React components are nouns in PascalCase: `IdeaCard`, `PlanMilestoneList`. Hooks start with `use`: `useWorkspaceLiveUpdates`.
- Constants are `SCREAMING_SNAKE_CASE` and live in one constants file per feature.
- Files use `kebab-case` and say what is inside: `idea-routes.ts`, `idea-card.tsx`, `calculate-ice-score.ts`.

| Bad | Good |
|---|---|
| `getData`, `handleIt`, `tmp`, `res2` | `listIdeasForWorkspace`, `handleVoteButtonClick`, `ideaRows`, `createdIdeaResponse` |
| `u`, `ws`, `cb` | `currentUser`, `workspaceSocket`, `onVoteCast` |
| `utils.ts` (a dumping ground) | `format-relative-time.ts`, `build-invite-link.ts` |

### 2.2 Structure — group files by feature, then by role
- One folder per feature. Inside a feature: `components/`, `hooks/`, `api/`, `types.ts`, `constants.ts`.
- Shared code lives in `shared/` (web) or `packages/shared/` (used by both web and worker). Nothing is shared by copy-paste.
- Maximum ~200 lines per file. Split when a file does more than one job.
- Routes only parse and respond; business logic goes in `services/`; SQL goes in `database/`.

### 2.3 Comments — every file is self-explaining
Every file begins with a header, and the code is divided into banner-labelled sections:

```ts
// =============================================================================
// FILE:    apps/worker/src/routes/idea-routes.ts
// PURPOSE: HTTP endpoints for listing, creating, and voting on ideas.
// USED BY: apps/worker/src/index.ts (mounted at /api/workspaces/:workspaceId/ideas)
// =============================================================================

// -----------------------------------------------------------------------------
// SECTION: Imports
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// SECTION: Request validation schemas
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// SECTION: Route handlers
// -----------------------------------------------------------------------------
```

- Comments explain **why**, not what the next line obviously does.
- Every exported function has a short doc comment: what it does, what it returns, what can go wrong.
- No commented-out code. No `TODO` without an owner and a reason.

### 2.4 Platform limits — free tier is a design constraint
- Cloudflare **free plan only**. Durable Objects must be **SQLite-backed** (`new_sqlite_classes`), the only kind available on free.
- Use the **WebSocket Hibernation API** (`this.ctx.acceptWebSocket`) so idle rooms cost nothing.
- Every WebSocket message counts as a request. **Do not stream cursor positions.** Throttle presence to at most one update every 2 seconds, and send small payloads.
- D1 enforces daily row-read and row-write limits on the free plan. Add indexes for every `WHERE` and `ORDER BY` column, never `SELECT *` on unbounded tables, and always paginate lists.
- Before relying on any limit or price, re-check Cloudflare's current docs. Limits change.

### 2.5 Quality and security
- TypeScript `strict: true` everywhere. No `any` without a comment explaining why.
- Validate **every** request body, query string, and WebSocket message with Zod schemas defined once in `packages/shared`.
- Check workspace membership on every workspace-scoped route, with no exceptions.
- Never trust the client for user identity. Never commit secrets. Use `wrangler secret` and `.dev.vars` (gitignored).
- Rich text is stored as structured JSON (Tiptap/Yjs), never raw HTML from users.
- Accessibility: keyboard reachable, visible focus rings, `aria-label` on icon buttons, text contrast of at least 4.5:1 in both themes, respect `prefers-reduced-motion`.

---

## 3. Technology stack (decided; do not swap without asking)

| Layer | Choice |
|---|---|
| Language | TypeScript everywhere |
| Monorepo | pnpm workspaces |
| Frontend | React + Vite + Tailwind CSS v4 |
| Routing and data | TanStack Router + TanStack Query |
| UI primitives | shadcn/ui components (copied into the repo; Radix underneath) |
| Icons | lucide-react |
| Backend | Cloudflare Worker + Hono |
| Validation | Zod (shared) |
| Database | D1 via Drizzle ORM, SQL migrations in `apps/worker/migrations` |
| Realtime | Durable Objects: `WorkspaceRoom` (events, presence, session timer) and `PlanDocumentRoom` (Yjs sync) |
| Collaborative notes | Yjs + Tiptap, persisted as snapshots in the Durable Object's SQLite storage |
| Files | R2 (optional; only if the feature needs uploads) |
| Auth | Cloudflare Access (email one-time PIN) in production, with a safe dev fallback (section 6) |
| PWA | vite-plugin-pwa (Workbox) + y-indexeddb for offline notes |
| Fonts | Inter (UI) and JetBrains Mono (labels, code), self-hosted with `@fontsource` |
| Tests | Vitest (unit), Playwright (a few end-to-end flows) |
| Lint/format | Biome |

**Validate before you pin:** for every dependency, confirm on npm that it is maintained and compatible with Workers (no Node-only APIs unless `nodejs_compat` is enabled), and pin exact versions. If a listed library has become unmaintained, pick the closest maintained alternative and say so.

---

## 4. Repository layout

```
ideo/
├── .github/workflows/ci.yml          # typecheck, lint, test, build on every pull request
├── apps/
│   ├── web/                          # React single-page app
│   │   ├── public/                   # manifest, icons
│   │   ├── index.html                # includes the no-flash theme script
│   │   └── src/
│   │       ├── app/                  # providers, router, app shell, theme provider
│   │       ├── features/
│   │       │   ├── workspaces/       # create/join workspace, member list, invite links
│   │       │   ├── ideas/            # board, card, detail drawer, voting, ICE scoring
│   │       │   ├── plans/            # plan page, milestones, notes editor
│   │       │   ├── tasks/            # task board
│   │       │   ├── brainstorm-sessions/  # timer, spark prompts, anonymous mode
│   │       │   └── activity/         # activity feed
│   │       ├── shared/
│   │       │   ├── components/ui/    # Button, Card, Dialog, Toast, Avatar, Badge, Skeleton...
│   │       │   ├── hooks/
│   │       │   ├── lib/              # api client, formatting helpers (one job per file)
│   │       │   └── styles/           # global.css with design tokens
│   │       └── main.tsx
│   └── worker/
│       ├── migrations/               # 0001_initial_schema.sql ...
│       └── src/
│           ├── index.ts              # entry: mounts routes, exports Durable Objects
│           ├── auth/                 # identity resolution, Access JWT verification
│           ├── routes/               # one file per resource
│           ├── services/             # business rules
│           ├── database/             # Drizzle schema + query functions
│           ├── realtime/             # Durable Object classes + message handlers
│           └── configuration/        # typed environment bindings, constants
├── packages/
│   └── shared/src/                   # Zod schemas, shared types, constants (stages, limits)
├── docs/                             # architecture.md, deployment.md, ideas-backlog.md
├── wrangler.jsonc
├── pnpm-workspace.yaml
├── biome.json
└── README.md                         # setup in 5 steps a newcomer can follow
```

---

## 5. Data model (D1)

Write this as `0001_initial_schema.sql`. Use text UUIDs (`crypto.randomUUID()`) and ISO-8601 timestamps.

```sql
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
```

**ICE score** = `(impact_score + confidence_score + ease_score) / 3`, rounded to one decimal, calculated in one function (`calculateIceScore`) in `packages/shared`. Ideas missing any of the three scores have no ICE score.

**Anonymous ideas:** when `is_anonymous = 1` the API must not return `author_user_id` to other members until the session ends.

---

## 6. Backend rules

### 6.1 API surface (all under `/api`, all JSON, all validated)

```
GET    /api/me
POST   /api/workspaces                              create workspace
POST   /api/workspaces/join                         body: { inviteCode }
GET    /api/workspaces/:workspaceId                 workspace + members
POST   /api/workspaces/:workspaceId/invites         create invite link
GET    /api/workspaces/:workspaceId/ideas           ?stage=&cursor=&limit=
POST   /api/workspaces/:workspaceId/ideas
PATCH  /api/ideas/:ideaId                           title, description, stage, scores, tags
POST   /api/ideas/:ideaId/vote                      toggle vote
POST   /api/ideas/:ideaId/comments
POST   /api/ideas/:ideaId/promote-to-plan
GET    /api/workspaces/:workspaceId/plans
GET    /api/plans/:planId                           plan + milestones + tasks
PATCH  /api/plans/:planId
POST   /api/plans/:planId/milestones
POST   /api/plans/:planId/tasks
PATCH  /api/tasks/:taskId                           status, assignee, sort_order
POST   /api/workspaces/:workspaceId/brainstorm-sessions
POST   /api/brainstorm-sessions/:sessionId/start
GET    /api/workspaces/:workspaceId/activity        ?cursor=&limit=
GET    /api/workspaces/:workspaceId/export          Markdown or JSON bundle
GET    /ws/workspaces/:workspaceId                  WebSocket upgrade (WorkspaceRoom)
GET    /ws/plans/:planId/document                   WebSocket upgrade (PlanDocumentRoom)
```

Every mutation does four things in order: **authenticate → authorize membership → validate → persist**, then writes an `activity_events` row and notifies the room (section 6.3).

### 6.2 Authentication
- **Production:** the site sits behind Cloudflare Access (email one-time PIN). The Worker **verifies the Access JWT** (`Cf-Access-Jwt-Assertion`) against the team's public keys. Never trust the email header on its own. Create the `users` row on first sign-in.
- **Local development only:** if `DEVELOPMENT_USER_EMAIL` is set in `.dev.vars`, use it as the identity. The fallback must be impossible to enable in production (check an explicit `ENVIRONMENT !== "production"`).
- Confirm Cloudflare Access's current free-plan user limit before relying on it.

### 6.3 Realtime design (simple on purpose)
- **Mutations go over HTTP**, not WebSocket, so they are validated and persisted the normal way.
- After a successful mutation, the route calls the workspace's `WorkspaceRoom` object, which broadcasts a tiny event to every connected client: `{ "type": "workspace_event", "eventType": "idea_voted", "subjectId": "..." }`.
- Clients react by invalidating the matching TanStack Query cache entry. Events carry **ids, not data**, so payloads stay small and clients cannot be fed stale or unauthorized data.
- WebSocket messages the server accepts (all Zod-validated): `presence_update`, `ping`.
- Messages the server sends: `presence_snapshot`, `workspace_event`, `brainstorm_timer_tick` (sent once at start with the end time; clients count down locally, so there is no per-second traffic).
- Durable Object skeleton to follow:

```ts
export class WorkspaceRoom extends DurableObject<EnvironmentBindings> {
  // Accept a new WebSocket and remember who connected (survives hibernation).
  async fetch(request: Request): Promise<Response> {
    const [clientSocket, serverSocket] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(serverSocket);
    serverSocket.serializeAttachment({ userId, displayName });
    return new Response(null, { status: 101, webSocket: clientSocket });
  }

  async webSocketMessage(socket: WebSocket, rawMessage: string | ArrayBuffer) { /* validate, then handle */ }
  async webSocketClose(socket: WebSocket) { /* remove from presence, broadcast snapshot */ }
}
```

- `PlanDocumentRoom` relays Yjs updates between connected clients and stores a compacted snapshot in its own SQLite storage. Compact on a schedule, not on every keystroke. Prefer a maintained provider library if one fits Workers; otherwise write a small one.

### 6.4 Entry point and configuration

`wrangler.jsonc` at the repo root (a **single Worker** serves the built app and the API):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "ideo",
  "main": "apps/worker/src/index.ts",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./apps/web/dist",
    "binding": "STATIC_ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/ws/*"]
  },
  "d1_databases": [
    {
      "binding": "DATABASE",
      "database_name": "ideo-database",
      "database_id": "REPLACE_WITH_ID_FROM_wrangler_d1_create",
      "migrations_dir": "apps/worker/migrations"
    }
  ],
  "durable_objects": {
    "bindings": [
      { "name": "WORKSPACE_ROOM", "class_name": "WorkspaceRoom" },
      { "name": "PLAN_DOCUMENT_ROOM", "class_name": "PlanDocumentRoom" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["WorkspaceRoom", "PlanDocumentRoom"] }
  ],
  "observability": { "enabled": true }
}
```

`run_worker_first` matters: without it the single-page-app fallback would answer `/api/...` with `index.html`. Check the current Wrangler docs for the exact option shape before finalizing.

---

## 7. Frontend rules

### 7.1 Design system — modern, calm, readable

**Tokens live in one file** (`apps/web/src/shared/styles/global.css`) as semantic CSS variables, wired into Tailwind v4 so utilities like `bg-page` and `text-muted` change with the theme automatically.

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

/* ---- Light theme (default) ---- */
:root {
  --surface-page: #f6f8f9;
  --surface-card: #ffffff;
  --surface-sunken: #eef2f4;
  --border-subtle: #dde3e7;
  --text-primary: #0f1a1f;
  --text-muted: #5b6b75;
  --accent: #007a80;            /* 5:1 contrast on white */
  --accent-contrast: #ffffff;
  --success: #15803d;
  --warning: #b45309;
  --danger: #c62828;
  --radius-control: 0.5rem;     /* set to 0 for a sharp, HUD-style look */
}

/* ---- Dark theme: true black for OLED screens ---- */
.dark {
  --surface-page: #000000;
  --surface-card: #0a0d10;
  --surface-sunken: #11161b;
  --border-subtle: #1f2933;
  --text-primary: #e6edf3;
  --text-muted: #8b98a5;
  --accent: #00dce5;            /* teal signature accent */
  --accent-contrast: #001a1c;
  --success: #22c55e;
  --warning: #f5a524;
  --danger: #ff4c4c;
}

@theme inline {
  --color-page: var(--surface-page);
  --color-card: var(--surface-card);
  --color-sunken: var(--surface-sunken);
  --color-subtle: var(--border-subtle);
  --color-primary: var(--text-primary);
  --color-muted: var(--text-muted);
  --color-accent: var(--accent);
  --color-accent-contrast: var(--accent-contrast);
  --radius-control: var(--radius-control);
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, monospace;
}
```

Stage colors (use as badge accents, always paired with a text label, never color alone): spark = amber, shaping = blue, validated = teal, planned = violet, launched = green.

**No-flash theme script** goes inline in `index.html` `<head>`: read the saved choice (`light` | `dark` | `system`) from `localStorage` inside `try/catch`, resolve `system` via `matchMedia`, and add or remove the `dark` class on `<html>` before first paint. The `ThemeProvider` and `ThemeToggle` (sun, moon, and monitor icons) manage changes afterward and listen for system changes while on `system`.

### 7.2 Modern UI elements to include
- **App shell:** collapsible sidebar on desktop, bottom tab bar on mobile, sticky top bar with workspace switcher, search/command palette (`Ctrl/⌘ + K`), presence avatars, theme toggle.
- **Idea board:** responsive card grid, stage filter chips, sort (newest, most voted, best ICE), skeleton loaders, optimistic voting with a small spring animation.
- **Idea drawer:** slides in from the right with description, ICE sliders, tags, comments, and the "Promote to plan" button.
- **Plan page:** header summary, milestone timeline, task board, and a notes tab with the collaborative editor and a "N people editing" indicator.
- **Brainstorm session screen:** big countdown ring, spark prompt card with a "next prompt" button, fast idea input, live idea stream.
- **Feedback:** toasts for success/error, inline empty states with an illustration-free icon and one clear action, confirm dialogs for destructive actions.
- **Motion:** 150–200 ms transitions, disabled under `prefers-reduced-motion`.
- **Layout:** mobile-first; test at 360 px and 1280 px widths. Respect safe-area insets in the PWA.

### 7.3 Data and state
- Server state lives in TanStack Query only. Small UI state lives in component state. Do not add a global store unless something truly needs it.
- One API client file wraps `fetch`, parses responses with the shared Zod schemas, and turns failures into typed errors the UI can show.
- `useWorkspaceLiveUpdates(workspaceId)` is the **only** place that opens the workspace WebSocket. It reconnects with backoff and invalidates queries on events.

### 7.4 Component example (naming and sectioning style to copy)

```tsx
// =============================================================================
// FILE:    apps/web/src/features/ideas/components/idea-vote-button.tsx
// PURPOSE: Button that lets the current user add or remove their vote on an idea.
// USED BY: idea-card.tsx, idea-detail-drawer.tsx
// =============================================================================

// ---- Types ------------------------------------------------------------------
type IdeaVoteButtonProps = {
  ideaId: string;
  voteCount: number;
  isVoteCastByCurrentUser: boolean;
};

// ---- Component --------------------------------------------------------------
export function IdeaVoteButton({ ideaId, voteCount, isVoteCastByCurrentUser }: IdeaVoteButtonProps) {
  const { toggleVote, isTogglingVote } = useToggleIdeaVote(ideaId);

  return (
    <button
      type="button"
      onClick={toggleVote}
      disabled={isTogglingVote}
      aria-pressed={isVoteCastByCurrentUser}
      aria-label={isVoteCastByCurrentUser ? "Remove your vote" : "Vote for this idea"}
      className="inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-sm text-muted hover:bg-sunken aria-pressed:text-accent"
    >
      <ArrowBigUp className="size-4" aria-hidden />
      {voteCount}
    </button>
  );
}
```

---

## 8. PWA

- `manifest.webmanifest`: name "Ideo", `display: standalone`, theme and background colors for both themes, 192/512 icons plus a maskable icon.
- Service worker via vite-plugin-pwa: precache the app shell, **network-first** for `/api/*` GET requests, **never** cache `/ws/*`.
- Offline: reading previously loaded data works; plan notes edit offline through y-indexeddb and sync on reconnect.
- Show an "Install Ideo" prompt on Android. On iOS show a small hint explaining Share → Add to Home Screen, because iOS has no install prompt.
- iOS note: push notifications only work after the app is added to the Home Screen. Do not build notification features in the foundation.

---

## 9. CI/CD (GitHub → Cloudflare)

1. **Pull requests:** `.github/workflows/ci.yml` runs install (frozen lockfile), typecheck, Biome, Vitest, and `pnpm --filter web build`.
2. **Deploy on push to `main`:** connect the GitHub repo in the Cloudflare dashboard (Workers Builds).
   - Build command: `pnpm install --frozen-lockfile && pnpm --filter web build`
   - Deploy command: `npx wrangler deploy`
3. **Database migrations:** apply with `npx wrangler d1 migrations apply ideo-database --remote` (a documented manual step in `docs/deployment.md`, or a guarded CI step). Never auto-run destructive migrations.
4. **Alternative** if Workers Builds does not fit: a GitHub Actions deploy job using `cloudflare/wrangler-action` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets.

Local development: run `pnpm dev`, which starts the Worker with `wrangler dev` and the web app with Vite, proxying `/api` and `/ws` to the Worker. Prefer Cloudflare's official Vite plugin if current docs support this layout; otherwise use the proxy.

---

## 10. Build order (stop and verify after each phase)

1. **Skeleton:** monorepo, shared package, empty Worker + Vite app, `wrangler.jsonc`, CI, README. *Verify:* `pnpm build` passes and `wrangler deploy --dry-run` succeeds.
2. **Design system:** tokens, theme provider and toggle, app shell, UI primitives. *Verify:* both themes meet contrast, no flash on reload, mobile layout works.
3. **Auth + workspaces:** identity resolution, `users`, workspaces, invites, join flow.
4. **Ideas:** board, create, vote, comment, tags, ICE scoring, stages.
5. **Realtime:** `WorkspaceRoom`, live updates, presence. *Verify:* two browsers see each other's votes within about a second.
6. **Plans and tasks:** promote to plan, milestones, task board.
7. **Collaborative notes:** `PlanDocumentRoom`, Tiptap + Yjs, offline sync.
8. **Brainstorm sessions:** timer, spark prompts, anonymous mode.
9. **PWA + export + activity feed.**
10. **Hardening:** tests, accessibility pass, free-tier review, docs.

---

## 11. Definition of done (check every item before saying "finished")

- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` all pass.
- [ ] `npx wrangler deploy --dry-run` succeeds with the committed config.
- [ ] Every file has a header and labelled sections; no unclear names remain (search for single-letter variables and words like `data`, `temp`, `handle`, `util`).
- [ ] Every workspace-scoped route checks membership; at least one test proves a non-member gets a 403.
- [ ] Every request body, query string, and WebSocket message is Zod-validated.
- [ ] Both themes reviewed on mobile and desktop widths; text contrast is at least 4.5:1.
- [ ] Two simultaneous browser sessions see live updates and presence.
- [ ] Free-tier review written in `docs/architecture.md`: Durable Object class types, indexes on every filtered column, paginated lists, throttled presence.
- [ ] No secrets in the repo; `.dev.vars` is gitignored; the dev auth fallback is disabled in production.
- [ ] README lets a newcomer run the app locally in five steps.

## 12. How to work

- Deliver **complete files**, not partial diffs, so they can be pasted straight into the repo.
- Build one phase at a time. At the end of each phase, list the files created, how to run and verify them, and what comes next.
- If a requirement conflicts with the free tier or a rule above, say so and propose the closest compliant alternative instead of silently deviating.
- Re-check anything version- or limit-dependent against current official docs. Do not rely on memory for package versions, Cloudflare limits, or Wrangler options.
