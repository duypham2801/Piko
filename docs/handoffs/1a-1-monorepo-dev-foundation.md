# HANDOFF 1a-1 — Monorepo + API skeleton (guest session, Postgres) + Docker dev

You are the implementer for the project "What Should We Do?" in this repository.
Read `CLAUDE.md` first, then `docs/DECISIONS.md` (especially D-011…D-017) and `docs/ENVIRONMENTS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies beyond the "Allowed dependencies" list.
- If anything conflicts or is impossible, stop and report instead of improvising.

## Context

The repository is a greenfield project. It currently contains only docs, `CLAUDE.md`, `.gitignore` and `images/`. Git is initialized with no commits.

This task builds the **development foundation**:
- a pnpm monorepo with three packages: `apps/web`, `apps/api` and `packages/domain`;
- an API skeleton with Postgres and anonymous guest sessions (D-013);
- a fully Dockerized dev environment (compose project `wswd-dev`, D-015);
- a Makefile for dev operations.

There is no product UI and no design system yet. Those come in later handoffs, so the web app is only a technical sanity page.

Host facts:
- Linux, uid/gid 1000:1000 (matches the `node` user in `node:22-alpine`).
- Node 22, pnpm 10.18.3.
- Docker 29, Docker Compose v5.

## Scope
1. Monorepo tooling: pnpm workspaces, shared TS config, ESLint (flat config), Prettier, Vitest.
2. `packages/domain`: shared zod schemas for the API contracts used in this task.
3. `apps/api`:
   - Hono server
   - env validation
   - Drizzle + Postgres
   - `users` / `sessions` schema with a committed migration and a migration runner
   - guest-session middleware, CSRF (Origin) protection, guest-creation rate limit
   - `GET /api/healthz` and `GET /api/me`
   - JSON error handling and graceful shutdown
   - a production build script via tsup (the build output is used in handoff 1a-2)
4. `apps/web`: a minimal Vite + React + TS sanity page that calls `/api/me` and `/api/healthz` through the Vite dev proxy, with a minimal `vi` i18n dictionary.
5. Docker dev:
   - `docker/Dockerfile` with only the `base` and `dev` stages for now
   - `compose.dev.yaml`
   - `.dockerignore`
   - `.env.example`
6. `Makefile` with the dev targets.

## Out of scope (do NOT do)
- Production Docker stages, Caddy, `compose.prod.yaml`, prod Makefile targets, backup/rollback. These belong to handoff 1a-2.
- Design tokens, fonts, UI components, the `/design` page, routing. These belong to handoff 1b.
- Decision domain, selection engine, case opening.
- Real accounts or OAuth.
- Render, snapshot or E2E tests.
- Any CI configuration.

## Target file layout
```
.
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml                 # generated, committed
├── .npmrc
├── .nvmrc                         # 22
├── tsconfig.base.json
├── eslint.config.js
├── .prettierrc.json
├── .dockerignore
├── .env.example
├── Makefile
├── compose.dev.yaml
├── docker/
│   └── Dockerfile                 # stages: base, dev
├── packages/domain/
│   ├── package.json               # name: @wswd/domain
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       └── api/
│           ├── health.ts          # HealthResponse schema
│           ├── me.ts              # MeResponse schema
│           └── error.ts           # ApiError schema
├── apps/api/
│   ├── package.json               # name: @wswd/api
│   ├── tsconfig.json
│   ├── tsup.config.ts
│   ├── drizzle.config.ts
│   ├── drizzle/                   # generated SQL migrations + meta (committed)
│   └── src/
│       ├── index.ts               # bootstrap: env, db, serve, graceful shutdown
│       ├── app.ts                 # createApp(deps) → Hono app (no side effects)
│       ├── env.ts                 # zod-validated env, fail fast
│       ├── db/
│       │   ├── client.ts          # postgres.js + drizzle instance factory
│       │   ├── schema.ts          # users, sessions
│       │   └── migrate.ts         # runs drizzle-orm migrator, then exits
│       ├── auth/
│       │   ├── token.ts           # generate token, sha256 hash
│       │   ├── session.service.ts # resolveSession, createGuestSession, touchSession
│       │   ├── session.middleware.ts
│       │   └── rate-limit.ts      # in-memory fixed-window limiter (injectable clock)
│       ├── routes/
│       │   ├── health.ts
│       │   └── me.ts
│       └── lib/
│           └── errors.ts          # HttpError + onError/notFound handlers
│       (tests colocated as *.test.ts)
└── apps/web/
    ├── package.json               # name: @wswd/web
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html                 # lang="vi"
    └── src/
        ├── main.tsx
        ├── App.tsx                # sanity page
        ├── i18n/
        │   ├── vi.ts              # dictionary
        │   └── index.ts           # t(key) helper, typed keys
        └── lib/api/
            └── client.ts          # typed fetch wrapper using domain schemas
```

## Requirements

### Root / tooling
- Root `package.json`:
  - `"private": true`
  - `"packageManager": "pnpm@10.18.3"`
  - `"engines": { "node": ">=22 <23" }`
  - `"type": "module"`
- Root scripts:
  - `typecheck`: `pnpm -r typecheck`
  - `lint`: `eslint .`
  - `test`: `pnpm -r --if-present test`
  - `build`: `pnpm -r --if-present build`
  - `check`: typecheck, then lint, then test (fail on the first error)
  - `format`: `prettier --write .`
- `pnpm-workspace.yaml`: `apps/*` and `packages/*`.
- `tsconfig.base.json`:
  - `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`
  - `verbatimModuleSyntax`, `isolatedModules`
  - `target: ES2022`, `module: ESNext`, `moduleResolution: Bundler`
  - `skipLibCheck`, `noEmit`
  - Each package extends it. The web package adds DOM libs and `jsx: react-jsx`. The api adds Node types.
- `packages/domain` is an **internal source package**: its `package.json` `exports` points at `./src/index.ts` and it has no build step.
  - Web consumes it through Vite.
  - The api consumes it through tsx in dev and through tsup bundling in build. Configure `noExternal: [/^@wswd\//]`.
  - Use workspace protocol: `"@wswd/domain": "workspace:*"`.
- ESLint flat config:
  - `@eslint/js` recommended + `typescript-eslint` recommended for all TS.
  - `react-hooks` + `react-refresh` rules for `apps/web` only.
  - Ignore `dist`, `drizzle`, `node_modules`.
- Prettier: minimal config (singleQuote, semi, printWidth 100). Add a `.prettierignore` covering lockfile, drizzle and dist.
- `.npmrc`: `engine-strict=true`. Do not hoist everything; keep pnpm defaults.

### packages/domain
- Use zod (v4) schemas and export both each schema and its inferred type:
  - `HealthResponse`: `{ status: 'ok' | 'degraded', db: 'ok' | 'down', version: string }`
  - `MeResponse`: `{ user: { id: string (uuid), kind: 'guest' | 'registered', createdAt: string (ISO) } }`
  - `ApiError`: `{ error: { code: string, message: string } }`
- No imports from React, DOM, Node, Hono or Drizzle (CLAUDE.md rule 3).

### apps/api

**Env (`env.ts`)**
- Parse `process.env` with zod at startup. If invalid, print a clear message and exit with code 1. Variables:
  - `NODE_ENV` (`development` | `production` | `test`)
  - `API_PORT` (default 8787)
  - `DATABASE_URL`
  - `APP_ORIGIN` (URL)
  - `COOKIE_SECURE` (boolean from `"true"`/`"false"`)
  - `TRUST_PROXY` (boolean)
  - `APP_VERSION` (default `"dev"`)
  - `GUEST_RATE_LIMIT_PER_HOUR` (int, default 20)
- `createApp` receives its config and dependencies as arguments, so it does not read `process.env` directly.

**DB**
- Use `postgres` (postgres.js) + `drizzle-orm`.
- Schema (snake_case columns):
  - `user_kind` pgEnum: `guest`, `registered`.
  - `users`:
    - `id` uuid pk default `gen_random_uuid()`
    - `kind` user_kind not null default `guest`
    - `created_at` timestamptz not null default now()
    - `last_seen_at` timestamptz not null default now()
  - `sessions`:
    - `id` uuid pk default `gen_random_uuid()`
    - `user_id` uuid not null, FK → users.id **on delete cascade**
    - `token_hash` text not null **unique**
    - `created_at` timestamptz not null default now()
    - `last_used_at` timestamptz not null default now()
    - `expires_at` timestamptz not null
    - index on `user_id`
- Migrations:
  - Generate them with drizzle-kit into `apps/api/drizzle/` and commit them.
  - `src/db/migrate.ts` uses `drizzle-orm/postgres-js/migrator` with a dedicated connection (`max: 1`), logs the result, closes the connection and exits 0/1.
  - **Do not use `drizzle-kit push`.**
- API scripts:
  - `dev`: `tsx watch src/index.ts`
  - `build`: tsup → `dist/index.js` and `dist/db/migrate.js`, ESM, target node22, sourcemaps
  - `start`: `node dist/index.js`
  - `db:generate`: drizzle-kit generate
  - `db:migrate`: `tsx src/db/migrate.ts`
  - `typecheck`: `tsc --noEmit`
  - `test`: `vitest run`

**Auth: guest sessions (D-013)**
- Token:
  - 32 random bytes from `node:crypto`, base64url encoded.
  - Only `sha256(token)` in hex is stored.
  - Hash lookups do not need a constant-time compare.
- Cookie `wswd_sid`:
  - `httpOnly`, `sameSite: 'Lax'`, `secure: COOKIE_SECURE`, `path: '/'`
  - `maxAge` 365 days
- `sessionMiddleware`, applied to identity routes:
  - **Valid session** (the cookie exists, the hash is found and `expires_at > now`): set `c.var.user` / `c.var.session`.
    - If `last_used_at` is older than 24h, update `sessions.last_used_at`, extend `expires_at` by 365 days, update `users.last_seen_at` and re-set the cookie.
    - Do **not** write to the DB on every request.
  - **No valid session**:
    1. Check the guest-creation rate limit per client IP. If the limit is exceeded, return 429 `ApiError` with code `rate_limited`.
    2. Create the user and session **in one transaction**, then set the cookie.
- Client IP:
  - If `TRUST_PROXY`, use the first value of `X-Forwarded-For`.
  - Otherwise use the socket remote address from `@hono/node-server` (`getConnInfo`).
- Rate limiter:
  - In-memory fixed window keyed by IP, `GUEST_RATE_LIMIT_PER_HOUR` per hour.
  - Inject the clock (`now: () => number`) for tests.
  - Prune expired keys periodically or on access, so memory cannot grow without bound.
- `/api/healthz` must **not** create sessions.

**CSRF**
- Apply `hono/csrf` on `/api/*` with `origin: APP_ORIGIN`. It is a no-op for GET; it is wired now for future mutations.
- Additionally, reject non-GET/HEAD requests whose `Content-Type` is not `application/json` with 415 `ApiError`.

**Routes**
- Mount everything under `/api`. Route modules stay thin.
- `GET /api/healthz` → `HealthResponse`.
  - Run `select 1` with a short timeout (about 1s).
  - On DB failure, return 503 with `status: 'degraded', db: 'down'`.
  - Include `APP_VERSION`.
- `GET /api/me` (behind the session middleware) → `MeResponse` for the current user.
- Responses must conform to the domain schemas. Typing the handlers with the inferred types is enough; runtime parsing of outgoing responses is not required.

**Errors**
- `HttpError(status, code, message)` class.
- `app.onError` handling:
  - `HttpError` → its status plus an `ApiError` body.
  - Unknown errors → 500 `internal_error`.
  - Log the error server-side. Never leak stack traces in the response.
- `app.notFound` → 404 `ApiError` with code `not_found`.

**Server**
- Use `@hono/node-server` and listen on `0.0.0.0:API_PORT`.
- Use `hono/logger` request logging in development only.
- Graceful shutdown on SIGTERM/SIGINT: stop accepting connections, close the server, `sql.end({ timeout: 5 })`, exit 0. Force exit after 10s.

### apps/web
- Vite + React 19 + TS, with the `@/` → `src/` alias.
- `vite.config.ts`:
  - `server.host: true`, `port: 5173`, `strictPort: true`
  - `proxy['/api']` → `process.env.API_PROXY_TARGET` (default `http://localhost:8787`), with `changeOrigin: false` so the Origin header matches `APP_ORIGIN`
  - `server.watch.usePolling` controlled by env `VITE_USE_POLLING === 'true'` (default off)
- `lib/api/client.ts`:
  - `apiGet<T>(path, schema)` uses `fetch` with `credentials: 'same-origin'` and parses the response with the zod schema.
  - Non-2xx responses are parsed as `ApiError` and thrown as a typed `ApiClientError`.
- i18n:
  - `vi.ts` exports a const dictionary.
  - `t(key)` is typed so unknown keys fail typecheck.
  - **All visible strings go through `t()`.**
- `App.tsx` is a plain technical sanity page (no styling effort, no design tokens). It shows:
  - the health status
  - the current guest id (shortened) and kind
  - a loading state and an error state
- `index.html`: `lang="vi"`, `<meta name="viewport">`, a title.
- Web scripts: `dev`, `build` (`tsc --noEmit && vite build`), `preview`, `typecheck`.

### Docker dev (D-015)

**`docker/Dockerfile`** has only these stages for now. Stage names must stay stable, because 1a-2 will add `build`, `api-prod` and `web-prod`.
- `base`:
  - `FROM node:22-alpine`
  - `corepack enable` and `corepack prepare pnpm@10.18.3 --activate`
  - `ENV PNPM_HOME=/pnpm` and add it to PATH
  - `WORKDIR /repo`
- `dev` (FROM base):
  - Pre-create these directories and **`chown node:node`** them, so empty named volumes inherit node ownership:
    - `/repo/node_modules`
    - `/repo/apps/web/node_modules`
    - `/repo/apps/api/node_modules`
    - `/repo/packages/domain/node_modules`
    - `/pnpm/store`
  - Set `npm_config_store_dir=/pnpm/store`.
  - `USER node`.
  - Do not copy the source; dev uses a bind mount.

**`compose.dev.yaml`**
- Top-level `name: wswd-dev`.
- All services use `env_file: .env.dev`.
- Services:
  - **`db`**:
    - `postgres:17-alpine`, volume `pgdata:/var/lib/postgresql/data`
    - healthcheck `pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB`
    - port `127.0.0.1:5433:5432`
  - **`install`** (one-off):
    - build target `dev`, bind mount `.:/repo`, plus the node_modules and store named volumes
    - command: `pnpm install --frozen-lockfile`
  - **`api`**:
    - same image and mounts as `install`
    - `depends_on`: `db` (`service_healthy`) and `install` (`service_completed_successfully`)
    - command: `sh -c "pnpm --filter @wswd/api db:migrate && pnpm --filter @wswd/api dev"`
    - port `127.0.0.1:8787:8787`
  - **`web`**:
    - same image and mounts
    - `depends_on`: `install` completed and `api` started
    - environment `API_PROXY_TARGET=http://api:8787`
    - command: `pnpm --filter @wswd/web dev`
    - port `127.0.0.1:5173:5173`
- Bind every published port to `127.0.0.1` only.
- Named volumes: `pgdata`, `pnpm-store`, `nm-root`, `nm-web`, `nm-api`, `nm-domain`. Docker prefixes them with the project name automatically. Do **not** set `external` or a custom `name:` on volumes; isolation from prod depends on the project prefix.

**`.dockerignore`**
- Exclude `node_modules`, `**/node_modules`, `**/dist`, `.git`, `.env*` (but keep `!.env.example`), `backups`, `images`, `docs`.
- `docs` and `images` are not needed in images.

**`.env.example`**
- Contains every variable above with safe dev defaults and a comment per variable:
  - `POSTGRES_USER=wswd`, `POSTGRES_PASSWORD=wswd_dev_password`, `POSTGRES_DB=wswd`
  - `DATABASE_URL=postgres://wswd:wswd_dev_password@db:5432/wswd`
  - `API_PORT=8787`, `APP_ORIGIN=http://localhost:5173`
  - `COOKIE_SECURE=false`, `TRUST_PROXY=false`, `APP_VERSION=dev`
  - `GUEST_RATE_LIMIT_PER_HOUR=20`, `VITE_USE_POLLING=false`

### Makefile (dev targets only)
- Use `COMPOSE_DEV = docker compose -f compose.dev.yaml`.
- Every target is `.PHONY` and has a `## description` comment. `make help` lists the targets (make it the default goal).
- Targets:
  - `dev`: if `.env.dev` is missing, copy it from `.env.example` and print a notice. Then `up -d --build`, then print the URLs.
  - `dev-down`: `down` (keeps volumes).
  - `dev-logs`: `logs -f --tail=100`.
  - `dev-ps`
  - `dev-install`: re-run the `install` service, for use after dependency changes.
  - `db-generate`: run `pnpm --filter @wswd/api db:generate` in a one-off container (`run --rm --no-deps install …`).
  - `db-migrate`: run `pnpm --filter @wswd/api db:migrate` in a one-off container with access to `db`.
  - `db-psql`: open psql in the db container.
  - `check`: `run --rm --no-deps install pnpm check`.
  - `dev-reset-db`: **destructive**.
    - Ask for an interactive confirmation (`y/N`).
    - Then stop the stack and remove **only** the `wswd-dev_pgdata` volume.
    - Never use `down -v` in a way that could touch other projects.

### Tests (only these; follow the Testing policy)
- `apps/api/src/auth/rate-limit.test.ts`: under limit, at limit, window reset with an injected clock, keys isolated per IP, pruning.
- `apps/api/src/auth/token.test.ts`: token is base64url with 43 chars, two tokens differ, hash is deterministic hex of length 64.
- No DB integration tests, render tests or route smoke tests in this task.

## Allowed dependencies
Use the latest stable version of each and report the exact versions.
- Root (dev): `typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `prettier`, `vitest`
- `@wswd/domain`: `zod` (v4)
- `@wswd/api`:
  - runtime: `hono`, `@hono/node-server`, `drizzle-orm`, `postgres`, `zod`, `@wswd/domain`
  - dev: `drizzle-kit`, `tsx`, `tsup`, `@types/node`
- `@wswd/web`:
  - runtime: `react`, `react-dom`, `zod`, `@wswd/domain`
  - dev: `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`

Anything else, including dotenv, a router, cookie libraries or UI libraries, requires stopping and asking. Hono already provides cookie and CSRF helpers.

## Acceptance criteria
- [ ] `pnpm-lock.yaml` exists and `pnpm install --frozen-lockfile` succeeds inside the dev container.
- [ ] `make dev` starts `db`, `install` (exits 0), `api` and `web` on a clean machine.
- [ ] `docker compose ls` shows project `wswd-dev`, and the volumes are prefixed `wswd-dev_`.
- [ ] Opening `http://localhost:5173` shows the sanity page with health `ok` and a guest id.
  - Reloading keeps the **same** guest id.
  - Clearing cookies yields a **new** guest id.
- [ ] Response headers of `/api/me` include `Set-Cookie: wswd_sid=…; HttpOnly; SameSite=Lax; Path=/` on first visit.
- [ ] `sessions.token_hash` in the DB contains a 64-char hex hash, not the raw cookie value.
- [ ] Stopping `db` makes `/api/healthz` return 503 `degraded` instead of crashing the api.
- [ ] Editing `App.tsx` hot-reloads in the browser. Editing an api file restarts the api (tsx watch).
- [ ] A POST to `/api/me` from a foreign Origin is rejected by CSRF protection.
- [ ] Hitting `/api/me` without cookies more than `GUEST_RATE_LIMIT_PER_HOUR` times from one IP returns 429 `rate_limited`.
- [ ] Files created by containers in the bind mount (e.g. `drizzle/` migrations) are owned by uid 1000 on the host, not root.
- [ ] `make check` passes: typecheck, lint and tests.
- [ ] `pnpm --filter @wswd/api build` produces `dist/index.js` and `dist/db/migrate.js` with `@wswd/domain` bundled in. `pnpm --filter @wswd/web build` succeeds.
- [ ] No raw secrets are committed; `.env.dev` is gitignored.
- [ ] `packages/domain` has no framework/runtime imports.

## Validation
Run these and include trimmed output in the report:
```bash
make dev && make dev-ps
make check
docker compose -f compose.dev.yaml run --rm --no-deps install sh -c "pnpm --filter @wswd/api build && pnpm --filter @wswd/web build"
# one-time manual verification of the API (not a test suite):
curl -si http://localhost:5173/api/healthz
curl -si http://localhost:5173/api/me
make db-psql   # then: select id, kind from users; select length(token_hash) from sessions;
ls -ln apps/api/drizzle
```
Do not add automated smoke, E2E, render or snapshot tests.

Do **not** create git commits. The owner will review first.

## Report back (required format)
1. Summary of what was done
2. Files changed/created (list)
3. Exact dependency versions installed
4. Validation command output (trimmed)
5. Acceptance criteria checklist with ✅/❌ and notes
6. Deviations from this handoff and why
7. Known issues / open questions (e.g. anything awkward with pnpm + bind mounts + volumes)
8. What the owner should check in the browser
