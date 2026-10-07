# HANDOFF 1a-2 — Production Docker stack (Caddy, migrate, hardening, release/backup/rollback)

You are the implementer for the project "What Should We Do?" in this repository.
Read `CLAUDE.md` first, then:
- `docs/DECISIONS.md`, especially D-013 (sessions), D-014 (migrations), D-015 (Docker), D-016 (release/migration discipline)
- `docs/ENVIRONMENTS.md`
- the section "Notes for 1a-2 (prod)" in `docs/IMPLEMENTATION_PLAN.md`

You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- If anything conflicts or is impossible, stop and report.

## Context

Handoff 1a-1 is done and committed on `main`. That gives us:
- the pnpm monorepo
- the Hono api with guest sessions and Postgres
- the Vite web sanity page
- the isolated dev stack (compose project `wswd-dev`, `make dev`)

This task adds the **production stack**, a separate compose project named `wswd-prod`. The owner must be able to keep developing on dev while prod runs, with no shared containers, networks or volumes between the two.

Prod topology (D-015):
```
Internet ──► caddy (wswd-web image: Caddy + static web dist) :80/:443
               ├── /api/*  → api:8787 (wswd-api image)
               └── /*      → static files, SPA fallback to index.html
             api ──► db (postgres:17-alpine, internal network only)
             migrate (wswd-api image, one-off) runs before api starts
```

Build and deploy happen **on the same host**: the repo is cloned on the server and images are built locally. There is no registry yet.

## Scope
1. `docker/Dockerfile`: add the stages `build`, `api-prod` and `web-prod`. **Do not change** the existing `base` and `dev` stages.
2. `docker/Caddyfile`
3. `compose.prod.yaml`
4. `.env.prod.example`, committed.
5. Makefile `prod-*` targets.
6. Small app-side changes required for prod:
   - In `apps/api/package.json`, move `@wswd/domain` to `devDependencies`. It is bundled by tsup (`noExternal`), so it is not needed at runtime.
   - In `apps/api/src/env.ts`, add a refinement: when `NODE_ENV=production` and `APP_ORIGIN` starts with `https://`, `COOKIE_SECURE` must be `true`. Otherwise startup fails with a clear message.
7. `.gitignore`: add `.deploy/` and `!.env.prod.example`. Note that `.env*` is currently ignored, so the new example would otherwise be ignored too.

## Out of scope (do NOT do)
- CI/CD, image registry, remote deploy over SSH, staging environment.
- Off-site backup upload or a cron schedule. Only provide the make targets.
- Any change to the dev stack behavior (`compose.dev.yaml`, `base`/`dev` stages, dev Makefile targets).
- Design system or product features.
- New dependencies, including npm packages and extra Docker images. The only images allowed are `node:22-alpine`, `postgres:17-alpine` and `caddy:2-alpine`.
- Render, E2E or smoke test suites. The verification below is a one-time manual check.
- Git commits. The **only** git write allowed is creating and deleting local test tags `v0.0.1-rc.1` and `v0.0.1-rc.2`, as described in the Validation section.

## Requirements

### 1. Dockerfile (new stages)

**`build`** (FROM base): installs dependencies with layer caching and builds both apps.
- Copy only `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc` and `package.json`, then run `pnpm fetch` with a BuildKit cache mount (`--mount=type=cache,id=wswd-pnpm,target=/pnpm/store`) and `ENV npm_config_store_dir=/pnpm/store`.
- Then `COPY . .` and run `pnpm install --frozen-lockfile --offline`, using the same cache mount.
- Build with `NODE_ENV=production` set **for the build commands only**. Do not set it for install, because devDependencies are needed to build.
  - `NODE_ENV=production pnpm --filter @wswd/web build`
  - `NODE_ENV=production pnpm --filter @wswd/api build`
  - This is critical: with `NODE_ENV=development`, Vite bundles development React (see IMPLEMENTATION_PLAN notes).
- Produce a pruned production `node_modules` for the api:
  - Run `pnpm --filter @wswd/api deploy --prod --legacy /out/api` with the cache mount.
  - If `--legacy` is not accepted by pnpm 10.18.3, stop and report the error. Do not switch strategies on your own.

**`api-prod`** (FROM `node:22-alpine`, **not** from `base`):
- `ENV NODE_ENV=production`
- Remove package managers from the runtime image: npm, npx, corepack, yarn (`/usr/local/lib/node_modules`, the matching `/usr/local/bin/*` links and `/opt/yarn-*`).
- `WORKDIR /app`. Copy from `build`:
  - `/out/api/node_modules` → `/app/node_modules`
  - `/out/api/package.json` → `/app/package.json`
  - `apps/api/dist` → `/app/dist`
  - `apps/api/drizzle` → `/app/drizzle`
  - `migrate.js` resolves `../../drizzle` from `dist/db/`, which becomes `/app/drizzle`.
- Files stay **owned by root and read-only** for the runtime user. Run as `USER node`.
- `EXPOSE 8787`, `CMD ["node", "dist/index.js"]`.
- The image must not contain: `src/`, TypeScript, tsx, tsup, vite, drizzle-kit, any devDependency, or `.env*` files.

**`web-prod`** (FROM `caddy:2-alpine`):
- Copy `docker/Caddyfile` → `/etc/caddy/Caddyfile`.
- Copy `apps/web/dist` from `build` → `/srv`.
- Run as a **non-root** user:
  - Create a system user/group `caddy`.
  - `chown` `/data` and `/config` to it, so the named volumes inherit that ownership.
  - Set `USER caddy`.
  - Docker ≥20.10 sets `net.ipv4.ip_unprivileged_port_start=0` inside containers, so binding 80/443 as non-root works without capabilities. If it does not, stop and report.

### 2. Caddyfile

Use env placeholders `{$SITE_ADDRESS}` and `{$ACME_EMAIL}`.

**Global options**
- `email {$ACME_EMAIL}`
- `admin off`

**Site block `{$SITE_ADDRESS}`**
- `encode zstd gzip`
- `/api/*` → `reverse_proxy api:8787`. API 404s must stay JSON and must **never** fall back to `index.html`.
- Everything else: `root /srv`, `try_files {path} /index.html`, `file_server`.
- Cache headers:
  - `/assets/*` → `Cache-Control: public, max-age=31536000, immutable`
  - everything else served from `/srv`, including `index.html` and the SPA fallback → `Cache-Control: no-cache`
- Security headers on all responses:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (browsers ignore it over plain HTTP)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: DENY`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
  - remove the `Server` header
- JSON access log to stdout.

**Health listener**
- A separate site block `http://:8081` that only responds `ok` 200 on `/healthz`. It is used by the container healthcheck and is **not** published.

**X-Forwarded-For**
- Do **not** configure `trusted_proxies`. Caddy then discards client-supplied `X-Forwarded-*` and sets `X-Forwarded-For` to the real client IP.
- The api uses the first XFF value when `TRUST_PROXY=true`, so this is what makes the guest rate limit unspoofable.
- Add a comment in the Caddyfile explaining this.

### 3. `compose.prod.yaml`

- Top-level `name: wswd-prod`.
- **No `build:` sections.** Images come only from `make prod-build`:
  - `wswd-api:${APP_VERSION:?APP_VERSION is required}`
  - `wswd-web:${APP_VERSION:?…}`
- Shared hardening via YAML anchors/extension fields:
  - `read_only: true`
  - `security_opt: [no-new-privileges:true]`
  - `cap_drop: [ALL]`
  - `restart: unless-stopped` (except `migrate`)
  - logging `json-file` with `max-size: 10m`, `max-file: 3`
  - `init: true` for node services
  - `tmpfs: /tmp`
- Networks:
  - `backend` with `internal: true`, for db, migrate and api
  - `edge` (default bridge), for api and caddy
- No published ports except on caddy.

**Services**
- **`db`** (`postgres:17-alpine`):
  - `env_file: .env.prod`
  - `user: postgres`
  - volume `pgdata:/var/lib/postgresql/data`
  - tmpfs `/var/run/postgresql` and `/tmp`
  - healthcheck `pg_isready`
  - memory limit 512m
  - network `backend` only
  - **No published ports.**
  - If `read_only` + `cap_drop: ALL` + `user: postgres` prevent Postgres from starting on a fresh volume, you may relax **only** what is strictly necessary for `db`. Report exactly what you relaxed and why.
- **`migrate`** (wswd-api image):
  - `command: ["node", "dist/db/migrate.js"]`
  - `env_file: .env.prod`
  - `depends_on: db` (service_healthy)
  - `restart: "no"`
  - network `backend`
  - memory limit 256m
- **`api`** (wswd-api image):
  - `env_file: .env.prod`
  - `environment: APP_VERSION=${APP_VERSION}` and `NODE_OPTIONS=--max-old-space-size=192`
  - `depends_on`: `migrate` (service_completed_successfully) and `db` (service_healthy)
  - networks `backend` + `edge`
  - healthcheck: `node -e "fetch('http://127.0.0.1:8787/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"`
  - memory limit 256m, `pids_limit: 200`
- **`caddy`** (wswd-web image):
  - environment `SITE_ADDRESS` and `ACME_EMAIL` from `.env.prod` (via `env_file` or interpolation)
  - ports `${HTTP_PORT:-80}:80`, `${HTTPS_PORT:-443}:443` and `${HTTPS_PORT:-443}:443/udp` (HTTP/3)
  - volumes `caddy_data:/data` and `caddy_config:/config`. **The certificates must persist across deploys.**
  - `depends_on: api` (service_healthy)
  - network `edge`
  - healthcheck `wget -qO- http://127.0.0.1:8081/healthz`
  - memory limit 128m, `pids_limit: 200`

Volumes: `pgdata`, `caddy_data`, `caddy_config`. These are auto-prefixed `wswd-prod_`. Do not set `name:` or `external`.

### 4. `.env.prod.example` (committed; every variable commented)

```
NODE_ENV=production
POSTGRES_USER=wswd
POSTGRES_PASSWORD=CHANGE_ME        # generate: openssl rand -hex 32  (hex = URL-safe in DATABASE_URL)
POSTGRES_DB=wswd
DATABASE_URL=postgres://wswd:CHANGE_ME@db:5432/wswd
API_PORT=8787
APP_ORIGIN=https://example.com
COOKIE_SECURE=true
TRUST_PROXY=true
GUEST_RATE_LIMIT_PER_HOUR=20
SITE_ADDRESS=example.com
ACME_EMAIL=you@example.com
HTTP_PORT=80
HTTPS_PORT=443
```

`APP_VERSION` is **not** in the env file. The Makefile passes it.

Add a short comment block at the top explaining a **local prod test** setup:
- `SITE_ADDRESS=http://localhost`
- `HTTP_PORT=8080`, `HTTPS_PORT=8443`
- `APP_ORIGIN=http://localhost:8080`
- `COOKIE_SECURE=false`

### 5. Makefile prod targets

- `COMPOSE_PROD = docker compose -f compose.prod.yaml --env-file .env.prod`
- Every prod target must **refuse to run if `.env.prod` is missing**, with a message pointing to `.env.prod.example`. Never auto-create `.env.prod`.
- Add `## description` to each target so `make help` lists them. Mark them `.PHONY`.
- `TAG` defaults to the exact tag at HEAD (`git describe --tags --exact-match`). If HEAD is not exactly at a tag and no `TAG=` is given, fail.

**Targets**
- **`prod-build`**:
  - Build both images **from the git tag, not from the working tree**:
    - `git archive --format=tar "$(TAG)" | docker build -f docker/Dockerfile --target api-prod -t wswd-api:$(TAG) -`
    - and the same for `web-prod` → `wswd-web:$(TAG)`.
  - Uncommitted or untracked files, including `.env*`, must never reach the images.
  - Print the resulting image sizes.
- **`prod-deploy`** (`TAG=` as above):
  1. Fail if either image `wswd-api:$(TAG)` or `wswd-web:$(TAG)` is missing.
  2. If the db is running, run `prod-backup` first.
  3. `APP_VERSION=$(TAG) $(COMPOSE_PROD) up -d --wait --remove-orphans`. `migrate` runs automatically before `api`.
  4. On success, record versions in `.deploy/`:
     - `.deploy/previous` ← old `.deploy/current`
     - `.deploy/current` ← `$(TAG)`
  5. On failure, print how to roll back and exit non-zero.
- **`prod-rollback`**:
  - Read `.deploy/previous` and fail clearly if it is absent.
  - Deploy that tag (same `up -d --wait`, but without a backup), then swap `current` and `previous`.
  - Print a reminder that **DB migrations are not rolled back**; that is why migrations must stay backward compatible (D-016).
- **`prod-backup`**:
  - `$(COMPOSE_PROD) exec -T db pg_dump -U … -d … --format=custom` → `backups/wswd-prod-<UTC timestamp>-<current tag>.dump`
  - The file is written with mode 600 (use umask) and `backups/` is created if needed.
  - Keep the newest 30 dumps and delete older ones.
  - Print the path and size.
- **`prod-restore FILE=…`**:
  - **Destructive.** Require an interactive `y/N` confirmation that shows the file name.
  - Stop `api`, then run `pg_restore --clean --if-exists --no-owner` into the prod db from the file via stdin, then start `api` again.
- **`prod-down`**: stop the stack; volumes are kept.
- **`prod-ps`**, **`prod-logs`** (`logs -f --tail=100`).
- **`prod-config`**: `config --quiet` to validate the compose file with the env.
- APP_VERSION handling: `prod-ps`, `prod-logs`, `prod-down`, `prod-config`, `prod-backup` and `prod-restore` need it for compose interpolation. Default it to the content of `.deploy/current` (or a placeholder for `prod-config`), so these targets work without `TAG=`.

## Allowed dependencies
None. No npm packages and no images beyond `node:22-alpine`, `postgres:17-alpine` and `caddy:2-alpine`.

## Acceptance criteria

Use a **local prod test** on this machine, set up as described in `.env.prod.example`, **while the dev stack is running**.

**Build**
- [ ] `make prod-build TAG=v0.0.1-rc.1` builds both images from the tag.
  - Proof: temporarily change the title string in `apps/web/src/i18n/vi.ts` **without committing**, build, and confirm the served page still shows the committed title. Then revert the change.
- [ ] Image sizes are reported. Soft targets: `wswd-api` ≤ 150 MB, `wswd-web` ≤ 60 MB. Explain if they are exceeded.
- [ ] `wswd-api` contains no `npm`, `npx`, `corepack`, `yarn`, `src/`, `typescript`, `vite`, `tsx` or `drizzle-kit`. Show `ls /app` and `ls /app/node_modules`.
- [ ] `docker image inspect` shows a non-root `User` for both images.

**Deploy**
- [ ] `make prod-deploy TAG=v0.0.1-rc.1`:
  - takes no backup on the first deploy (db not running yet)
  - runs migrations before the api starts
  - ends with all services healthy
- [ ] `docker compose ls` shows **both** `wswd-dev` and `wswd-prod` running.
  - `docker volume ls` shows separate `wswd-prod_*` volumes.
  - A guest created at `http://localhost:8080` exists in the **prod** DB and not in the dev DB.
- [ ] `http://localhost:8080` shows the sanity page with health ok and version `v0.0.1-rc.1`. The first visit creates exactly 1 prod guest.
- [ ] `http://localhost:8080/some/deep/link` returns `index.html` (200). `http://localhost:8080/api/does-not-exist` returns a 404 JSON `ApiError`, not HTML.

**Caddy behavior**
- [ ] Headers: CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS are present, and there is no `Server` header.
  - `/assets/*.js` is `immutable`, `/` is `no-cache`.
  - The response is compressed when `Accept-Encoding: gzip` is sent.
- [ ] The DB is unreachable from the host: no published port, and `backend` is `internal: true`.
- [ ] Inside `api`: running `touch /app/x` fails (read-only), `id` shows `node`, and `CapEff` is all zeros (`grep Cap /proc/1/status`).
- [ ] XFF spoofing does not bypass the guest rate limit.
  - Temporarily set `GUEST_RATE_LIMIT_PER_HOUR=3` in `.env.prod` and redeploy.
  - Send 4 cookie-less `GET /api/me` requests through Caddy, each with a different spoofed `X-Forwarded-For`. The 4th returns 429.
  - Restore the value afterwards.

**Release, backup, rollback**
- [ ] `make prod-backup` creates a mode-600 `.dump` in `backups/`.
- [ ] Restore round-trip works:
  1. Note the guest count.
  2. Back up.
  3. `DELETE FROM users` in the prod db.
  4. `make prod-restore FILE=…`.
  5. The count is back.
- [ ] Rollback works:
  1. Tag the same commit `v0.0.1-rc.2`, then `make prod-build TAG=v0.0.1-rc.2 && make prod-deploy TAG=v0.0.1-rc.2`. This deploy takes a backup automatically, and health shows rc.2.
  2. `make prod-rollback`. Health shows rc.1 and `.deploy/current` is rc.1.
- [ ] `make prod-down` keeps the volumes, and `make prod-deploy` afterwards keeps the data.
- [ ] Prod targets refuse to run without `.env.prod`.

**Regression**
- [ ] Setting `NODE_ENV=production` with an `https://` `APP_ORIGIN` and `COOKIE_SECURE=false` makes the api refuse to start with a clear message.
- [ ] `make check` passes and the dev stack still works (`make dev`, HMR).
- [ ] Cleanup at the end:
  - delete the local test tags `v0.0.1-rc.1` and `v0.0.1-rc.2`
  - run `make prod-down`
  - remove the test images if desired
  - leave `.env.prod` in place (it is gitignored) and say so in the report

## Validation
Include trimmed output of the commands used for each acceptance item above. One-time checks with curl are fine; do not write scripts or test suites for them.

## Report back (required format)
1. Summary of what was done
2. Files changed/created (list)
3. Image sizes and the contents check of the api image
4. Acceptance criteria checklist with ✅/❌ and the evidence (trimmed command output)
5. Anything relaxed for `db` hardening, or any other deviation, and why
6. Known issues / open questions (e.g. Caddy/HTTP3, Postgres under read-only)
7. Exact steps the owner should follow on a real VPS: `.env.prod` values, DNS, first deploy
