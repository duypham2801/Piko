# HANDOFF 1a-2-fix-1 — Review fixes for the prod Docker stack, then the tag-based acceptance

You are the implementer for the project "What Should We Do?" in this repository.
Read `CLAUDE.md` first, then `docs/handoffs/1a-2-docker-prod.md`. This task fixes issues found in the review of that handoff.

You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- If anything conflicts or is impossible, stop and report.

## Context

Handoff 1a-2 is implemented in the working tree but not committed. The changes are in:
- `docker/Dockerfile`, `docker/Caddyfile`
- `compose.prod.yaml`, `.env.prod.example`
- `Makefile`, `.gitignore`
- `apps/api/package.json`, `apps/api/src/env.ts`, `pnpm-lock.yaml`

The architect reviewed it. Most of it is good and must **not** be refactored beyond what is listed below. In particular, leave these as they are:
- the `build`, `api-prod` and `web-prod` Dockerfile stages (except F6)
- `setcap -r /usr/bin/caddy` in `web-prod`. It is accepted, even though it adds about 52 MB to the web image.
- the `env.ts` refinement and the `@wswd/domain` move
- service hardening, networks, healthchecks and memory limits in `compose.prod.yaml` (except F3)
- the Caddy security headers and the XFF comment

The original acceptance could not test the **build from a git tag**, because the handoff forbade commits. This task permits commits **on a feature branch only** (see F2).

## Scope

### F1 (MUST): A failed backup is silent, and the deploy continues anyway

Make runs each recipe line with `sh -c` and without `-e`. In `prod-backup`, the commands are chained with `;`, so if `pg_dump` fails:
- the recipe still prints `Backup: …` and exits with the status of the last command (`stat`), which is 0
- a partial or empty `.dump` file stays in `backups/` and counts toward the 30-file retention, so it can push out a good backup
- `prod-deploy` sees success and continues to `migrate`, so it migrates **without a backup**

Fix `prod-backup`:
- Write the dump to a temporary file in `backups/` first (for example `<final name>.partial`). Rename it to the final name only if `pg_dump` exits 0 **and** the file is non-empty.
- On failure: delete the temporary file, print a clear error, and exit non-zero.
- Run retention **only after** a successful backup. Retention must match only finished `*.dump` files, never `.partial` files.
- Keep mode 600 (umask 077).

Fix `prod-deploy`:
- If the db is running and the backup fails, abort **before** `up`. Print that no changes were made and exit non-zero.

### F2 (MUST): Run the tag-based acceptance that was skipped

Git writes allowed in this task:
- create the branch `feat/1a-2-prod-docker` from the current `main`
- make commits on that branch
- create and delete the local tags `v0.0.1-rc.1` and `v0.0.1-rc.2`

Do **not** commit to `main`, merge, push, or create any other tag. The architect merges after review.

Steps:
1. Implement F1 and F3–F7 first.
2. Create the branch. Commit all 1a-2 work plus these fixes as **one** commit: `feat(ops): production Docker stack with Caddy, migrate gate and release targets`.
   - Make sure `.env.prod`, `backups/` and `.deploy/` are **not** committed. Check with `git show --stat HEAD`.
3. Reset the local prod state from the earlier test so the run starts clean:
   - `make prod-down`
   - remove `.deploy/` and the test dumps in `backups/`
   - remove the `wswd-api:local*` and `wswd-web:local*` images
   - remove the volumes `wswd-prod_pgdata`, `wswd-prod_caddy_data` and `wswd-prod_caddy_config`. These are local test volumes, so deleting them is fine here. Never do this on a real server.
   - Do **not** touch any `wswd-dev_*` volume or container.
4. Run the acceptance items from `1a-2-docker-prod.md` that use the tags. Use the local prod settings from `.env.prod.example` while the dev stack is running:
   - `make prod-build TAG=v0.0.1-rc.1`, with the proof that the image is built from the tag: temporarily edit the title in `apps/web/src/i18n/vi.ts` **without committing**, build, check that the served page still shows the committed title, then revert the edit (`git diff` must be empty afterwards).
   - First deploy of rc.1: no backup is taken, all services are healthy, `/api/healthz` shows `v0.0.1-rc.1`.
   - Tag the same commit `v0.0.1-rc.2`, build and deploy it. A backup is taken automatically and health shows rc.2.
   - `make prod-rollback`: health shows rc.1, `.deploy/current` is rc.1 and `.deploy/previous` is rc.2.
5. Clean up:
   - delete both tags
   - run `make prod-down`
   - leave `.env.prod` in place
   - stay on the branch

### F3 (SHOULD): Caddy receives the database password

`caddy` uses `env_file: .env.prod`, so the internet-facing container gets `POSTGRES_PASSWORD` and `DATABASE_URL` in its environment.
- Remove `env_file` from `caddy`. Keep only the interpolated `SITE_ADDRESS` and `ACME_EMAIL` in `environment:`, which already exist.
- Verify with `docker compose … exec caddy env`: it must not contain `POSTGRES_` or `DATABASE_URL`.

Leave `db`, `migrate` and `api` on `env_file`.

### F4 (SHOULD): A missing asset returns `index.html` with an immutable cache header

Right now, `try_files {path} /index.html` also applies to `/assets/*`. A request for a missing hashed asset (for example an old chunk after a deploy) gets:
- `200` with HTML instead of JS
- `Cache-Control: public, max-age=31536000, immutable`

Change the Caddyfile so that:
- `/assets/*` is served by `file_server` with **no** SPA fallback. A missing file returns `404`, and a 404 must not have the `immutable` cache header.
- Everything else keeps `try_files {path} /index.html` with `Cache-Control: no-cache`.

Keep the security headers on all responses.

Verify (with headers):
- `curl -sI http://localhost:8080/assets/does-not-exist.js` returns `404` and no `immutable`
- a real `/assets/index-*.js` returns `200` and `immutable`
- `/some/deep/link` returns `200` HTML and `no-cache`

### F5 (SHOULD): Redeploying the same tag destroys the rollback target

`prod-deploy` always copies `current` → `previous`. Redeploying the same tag, for example after an `.env.prod` change, sets `previous` = `current`, so `prod-rollback` becomes a no-op.
- Rotate `.deploy/previous` only when `$(TAG)` differs from the current `.deploy/current`. If it is the same tag, leave both files unchanged.

Verify: deploy rc.1, deploy rc.2, deploy rc.2 again. `.deploy/previous` must still be rc.1. Do this inside the F2 run, before the rollback step.

### F6 (NICE): `DOCKER_BUILDKIT=1` is set on the wrong command

In `DOCKER_BUILDKIT=1 git archive … | docker build …`, the variable applies to `git archive` and not to `docker build`.
- Remove it from the `prod-build` lines. BuildKit is the default builder on Docker Engine ≥ 23.
- Add `# syntax=docker/dockerfile:1` as the first line of `docker/Dockerfile`, so `RUN --mount=type=cache` is always parsed correctly.
- Also remove the duplicate `ENV npm_config_store_dir=/pnpm/store` in the `build` stage, since `base` already sets it.

`make dev` and the dev stages must behave exactly as before. Verify with `make dev` and `make check`.

### F7 (SHOULD): `@types/node` 26 is still in the lockfile

The 1a-1 fix pinned `@types/node` to `22.20.5` in `apps/api` only. The root workspace has no `@types/node`, so the optional peer of `vite` and `vitest` resolves to `@types/node@26.6.4`. Some of the tooling is therefore typed against Node 26, while the runtime is Node 22.
- Add `"@types/node": "22.20.5"` to the root `devDependencies`. This is the same version that is already in use, not a new dependency.
- Run the install **inside the dev container** (as the Makefile targets do), not on the host.
- After the install, `grep -c "@types/node@26" pnpm-lock.yaml` must print `0`.

## Out of scope (do NOT do)
- Anything else in the Dockerfile, compose files or Caddyfile.
- Dev stack changes.
- New dependencies or images.
- CI/CD, a registry, off-site backup, or cron jobs.
- Commits on `main`, merges, pushes, or tags other than the two rc tags.
- Shrinking image sizes. The architect has accepted the current sizes.

## Acceptance criteria
- [ ] F1: With the db stopped (`docker compose -f compose.prod.yaml --env-file .env.prod stop db`, with `APP_VERSION` set), `make prod-backup` exits non-zero with a clear message and leaves **no** new file (`.dump` or `.partial`) in `backups/`. After starting the db again, a backup succeeds with mode 600.
- [ ] F1: The `prod-deploy` code path aborts before `up` when the backup fails. Show the relevant recipe lines. A live demo is not required.
- [ ] F2: The branch `feat/1a-2-prod-docker` has one commit containing the 1a-2 work and these fixes, with no `.env.prod`, `backups/` or `.deploy/`.
- [ ] F2: The tag build proof works: the uncommitted title edit does not appear in the served page.
- [ ] F2: rc.1 first deploy → rc.2 deploy with an automatic backup → rollback to rc.1 all work, and `.deploy/` contents are correct at each step.
- [ ] F3: The `caddy` environment contains no `POSTGRES_*` or `DATABASE_URL`.
- [ ] F4: The three curl checks behave as specified.
- [ ] F5: `previous` survives a same-tag redeploy.
- [ ] F6: `make prod-config`, `make check` and `make dev` all work.
- [ ] F7: the lockfile has no `@types/node@26`, and `make check` still passes.
- [ ] Cleanup is done. Tags deleted, prod down, dev untouched (`docker volume ls | grep wswd-dev` lists the same volumes as before).

## Validation
Include trimmed output of the commands for each acceptance item. One-time curl checks are fine; do not write scripts or test suites.

## Report back (required format)
1. Summary
2. Files changed, plus the commit hash and `git show --stat HEAD`
3. Acceptance checklist with ✅/❌ and evidence (trimmed command output)
4. The final image sizes for `v0.0.1-rc.1`
5. Deviations and why
6. Known issues / open questions
