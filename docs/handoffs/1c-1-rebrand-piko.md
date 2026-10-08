# HANDOFF 1c-1 — Rebrand to PIKO: full `wswd` → `piko` rename

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decision **D-023** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

The product was built under the working title "What Should We Do?", with the short identifier `wswd` used everywhere in code and infrastructure. The owner renamed it:
- product name: **PIKO** (uppercase wordmark)
- tagline: **"Pick. Open. Go."**
- the tagline replaces "Stop thinking. Just open."

D-023 decides a **full rename** of every internal `wswd` identifier to `piko`. Prod has never served real users, so this is the cheapest moment.

`CLAUDE.md`, `docs/DECISIONS.md`, `docs/ENVIRONMENTS.md`, `docs/TOPOLOGY.md` and the master prompt are **already updated** by the architect. This task makes the code, config and infrastructure match.

This is a mechanical rename:
- Behavior, versions, structure, colors and fonts stay exactly the same.
- The only user-visible changes are the brand name, the tagline and the page title.

## Scope
- R1: package names and imports
- R2: dev and prod Docker / compose / Makefile identifiers
- R3: env example files
- R4: the session cookie name
- R5: visible brand: i18n, page title, `/design` hero text
- R6: lockfile and local dev stack migration

## Out of scope (do NOT do)
- Any file under `docs/**` or `CLAUDE.md`, which are already done. **Never** edit old handoffs, because they are historical records.
- Logos, favicons, colors, fonts or any other visual change.
- Renaming the repository folder on disk.
- Deleting any `wswd-*` Docker volume or image. The owner does that manually after verifying.
- Editing `.env.prod`, deploying prod, or creating git tags.
- New dependencies, version bumps, or refactors.
- Render, snapshot or E2E tests.

## Files to modify
The command below lists them:
```bash
grep -rIl --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs -iE "wswd|what should we do|what-should-we-do" .
```
Expect these files (stop and report if the list differs materially):
- root `package.json`, `pnpm-lock.yaml`
- `apps/api/package.json`, `apps/web/package.json`, `packages/domain/package.json`
- `apps/api/tsup.config.ts`
- `apps/api/src/auth/session.service.ts`, `apps/api/src/routes/health.ts`, `apps/api/src/routes/me.ts`
- `apps/web/index.html`, `apps/web/src/App.tsx`, `apps/web/src/i18n/vi.ts`, `apps/web/src/lib/api/client.ts`, `apps/web/src/lib/api/session.ts`, `apps/web/src/pages/design/DesignPage.tsx`
- `compose.dev.yaml`, `compose.prod.yaml`, `docker/Dockerfile`, `Makefile`
- `.env.example`, `.env.prod.example`

## Allowed dependencies
None. The lockfile changes only because workspace package names change.

## Requirements

### R0. Before touching anything: stop the old dev stack
The compose project name changes, so the current `make dev-down` will not find the old containers after the rename. Before editing, run `make dev-down` with the **old** files. It keeps the volumes and frees ports 5173 / 8787 / 5433. Check `docker ps` to confirm that no `wswd-*` container is running. If a `wswd-prod` stack is running, stop it with `make prod-down`.

### R1. Packages and imports
- Root `package.json`: `"name": "what-should-we-do"` becomes `"piko"`.
- `@wswd/domain`, `@wswd/api` and `@wswd/web` become `@piko/domain`, `@piko/api` and `@piko/web`. This covers:
  - the `name` fields
  - the `workspace:*` dependency keys
  - every import
  - `--filter` arguments
- `apps/api/tsup.config.ts`: `noExternal: [/^@piko\//]`.

### R2. Docker, compose, Makefile
- `compose.dev.yaml`: `name: piko-dev`, plus the `--filter @piko/...` commands.
- `compose.prod.yaml`: `name: piko-prod`, images `piko-api:${APP_VERSION…}` and `piko-web:${APP_VERSION…}`.
- `docker/Dockerfile`: cache mount `id=piko-pnpm`, plus the `--filter @piko/...` commands.
- `Makefile`:
  - every `wswd-api` / `wswd-web` image becomes `piko-api` / `piko-web`
  - `wswd-dev_pgdata` becomes `piko-dev_pgdata`, in both the prompt text and the commands
  - backup filenames `backups/wswd-prod-*.dump` become `backups/piko-prod-*.dump`, in the create, the retention `find`, and the usage text
  - `--filter @piko/api`
- Do not change any other Makefile logic.

### R3. Env examples
- `.env.example`:
  - `POSTGRES_USER=piko`
  - `POSTGRES_PASSWORD=piko_dev_password`
  - `POSTGRES_DB=piko`
  - `DATABASE_URL=postgres://piko:piko_dev_password@db:5432/piko`
- `.env.prod.example`:
  - `POSTGRES_USER=piko`
  - `POSTGRES_DB=piko`
  - `DATABASE_URL=postgres://piko:CHANGE_ME@db:5432/piko`
  - keep the `CHANGE_ME` placeholders
- Your **local** `.env.dev` (gitignored, never committed): update those four values the same way, so the fresh `piko-dev_pgdata` volume is created with the new user. Leave its other values as they are. Mention this in the report.

### R4. Session cookie
- `SESSION_COOKIE_NAME = 'piko_sid'` in `apps/api/src/auth/session.service.ts`.
- Nothing else in session logic changes.
- Existing `wswd_sid` cookies are simply ignored. That is accepted by D-023, so add no migration code.

### R5. Visible brand
- `apps/web/src/i18n/vi.ts`:
  - `title: 'PIKO'`
  - add `tagline: 'Pick. Open. Go.'`
  - Both stay English by decision, but must live in the dictionary.
- `apps/web/src/App.tsx`: in each of its three render branches, render `<p>{t('tagline')}</p>` directly under the `<h1>`. Change nothing else in `App.tsx`.
- `apps/web/index.html`: `<title>PIKO — Pick. Open. Go.</title>`. Keep `lang="vi"`.
- `DesignPage.tsx` hero: "The visual vocabulary for What Should We Do?" becomes "The visual vocabulary for PIKO." Keep the rest of the sentence. This is a dev-only page, so the literal is fine (D-022).

### R6. Lockfile and local verification
- Run `make dev`.
  - It creates the `piko-dev` project with fresh volumes.
  - `install` runs `pnpm install`, which rewrites `pnpm-lock.yaml`.
  - The `api` service applies migrations to the new empty DB on start.
- The lockfile diff may only rename `@wswd/*` → `@piko/*` and the root importer. **No version may change.** If any version changes, stop and report.
- The app at `http://localhost:5173` shows "PIKO" and "Pick. Open. Go.", health ok and a guest id.
- In DevTools, the cookie is `piko_sid`.

## Acceptance criteria
- [ ] The grep below prints **nothing** outside `docs/`.
- [ ] `make dev` starts project `piko-dev`, and `docker volume ls` shows `piko-dev_*` volumes.
- [ ] `localhost:5173` shows PIKO + tagline, health ok and a guest. The cookie name is `piko_sid`. The tab title is "PIKO — Pick. Open. Go.".
- [ ] `/design` loads, and its hero says "PIKO".
- [ ] `make check` passes.
- [ ] `make prod-config` passes, and both prod images build from the working tree under the new names (validation below). The test images are removed afterwards.
- [ ] Prod web build: no `/design` leak. Main JS gzip stays at about 91.7 kB (±0.2 kB).
- [ ] The lockfile diff contains no version changes.
- [ ] No `wswd-*` volume or image was deleted.

## Validation
Run these and include the trimmed output in the report:
```bash
make dev
make check
make prod-config

# leftovers outside docs (must print nothing)
grep -rIn --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs -iE "wswd|what should we do|what-should-we-do|stop thinking" .

# lockfile: only renames, no version changes (inspect; paste the summary)
git diff --stat pnpm-lock.yaml
git diff pnpm-lock.yaml | grep -E "^[+-]" | grep -vE "@(wswd|piko)/|^(\+\+\+|---)" | head -20

docker volume ls --format '{{.Name}}' | grep -E "^(piko|wswd)-"

# prod images build under the new names, then clean up
docker build -f docker/Dockerfile --target api-prod -t piko-api:rename-check .
docker build -f docker/Dockerfile --target web-prod -t piko-web:rename-check .
docker image ls --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep rename-check
docker image rm piko-api:rename-check piko-web:rename-check

docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c \
  'pnpm --filter @piko/web build && \
   (grep -rl "DesignPage\|ẤẦẨẪẬ\|Xoay kèo ngay" apps/web/dist && echo "LEAK" || echo "no /design in prod build")'
```
Afterwards delete `apps/web/dist`.

If the `git diff pnpm-lock.yaml … | grep` line shows anything other than lines about the root importer name, paste it and explain.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/1c-1-rebrand-piko` from `main`.
- Make exactly **one** commit: `chore: rename project to PIKO (wswd -> piko)`.
- Do not commit to `main`, merge or push. Never commit `.env.dev`.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including:
   - the main JS/CSS gzip sizes
   - the image sizes
   - the volume list
4. Deviations from this handoff and why
5. Known issues / open questions
6. What the owner should check in the browser:
   - `localhost:5173`: title, tagline and the `piko_sid` cookie
   - `/design`: the hero
   - the list of old `wswd-*` volumes/images still on the machine, so the owner can remove them
