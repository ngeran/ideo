# Ideo

A private space for your team's ideas, brainstorms, plans, and tasks — from first spark to launched. Runs entirely on **Cloudflare's free tier**: one Worker serves the web app and the API, D1 stores the data, and Durable Objects power realtime updates.

## Status: Phase 3 — auth + workspaces

The design system (light/dark themes, app shell, command palette), authentication (Cloudflare Access in production, a guarded dev fallback locally), workspaces with invite codes, and the join flow are live. Next phases: the idea board, realtime, plans and tasks, collaborative notes, brainstorm sessions, PWA/export/activity.

## Run it locally in 5 steps

1. **Install Node 22+ and pnpm** — e.g. `corepack enable` (pnpm version comes from `packageManager` in `package.json`).
2. **Install dependencies** — `pnpm install`
3. **Create the local database and identity** — `npx wrangler d1 create ideo-database`, paste the printed `database_id` into `wrangler.jsonc`, then `cp .dev.vars.example .dev.vars` and `pnpm db:migrate:local`.
4. **Start the dev servers** — `pnpm dev`, then open http://localhost:5173. Vite serves the app with hot reload on :5173 and proxies `/api` + `/ws` to `wrangler dev` on :8787. Your dev identity comes from `DEVELOPMENT_USER_EMAIL` in `.dev.vars`.
5. **Check it works** — create a workspace from the switcher, invite with a code, and run `pnpm verify` (typecheck, lint, build, tests in real workerd, deploy dry run).

## Scripts (repo root)

| Script | What it does |
| --- | --- |
| `pnpm dev` | Runs the web app and Worker together for local development |
| `pnpm build` | Builds the web app into `apps/web/dist` (served by the Worker) |
| `pnpm typecheck` | Typechecks every package with `strict` TypeScript |
| `pnpm lint` | Biome lint + format check (`pnpm lint:fix` to auto-fix) |
| `pnpm test` | Runs Worker tests inside real workerd (via `@cloudflare/vitest-pool-workers`) |
| `pnpm deploy:dry-run` | Proves the committed config bundles for deploy without deploying |
| `pnpm db:migrate:local` / `db:migrate:remote` | Applies D1 migrations locally / to production |

## Repository layout

```
ideo/
├── apps/
│   ├── web/            # React + Vite single-page app (features/ live here)
│   └── worker/         # Cloudflare Worker: Hono API, services, migrations, tests
├── packages/
│   └── shared/         # Zod schemas, constants, pure functions used by both apps
├── docs/               # architecture, deployment, backlog (written as phases land)
├── wrangler.jsonc      # One Worker: static assets + API + WebSockets
└── .github/workflows/  # CI on pull requests
```

## Deploying

A push to `main` deploys through Cloudflare Workers Builds; pull requests are checked by CI. Setup steps (Cloudflare resources, GitHub connection, D1 migrations) are in `docs/deployment.md`.

## Secrets

None live in this repository. Local secrets go in `.dev.vars` (gitignored — see `.dev.vars.example` once auth lands). Production secrets are set with `wrangler secret put`.
