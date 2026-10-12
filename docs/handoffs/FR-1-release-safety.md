# HANDOFF FR-1 — Release safety and session single-flight

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

The final engineering review (`docs/FINAL_ENGINEERING_REVIEW.md`, D-036) found three release blockers and one correctness bug. This task fixes them before Phase 9 (the first prod release). Everything happens on the integration branch `feat/final-review`.

**Release blockers (review "Critical issues" 1–3):**

- **R1: `prod-deploy` can migrate without a backup.**
  - In the `Makefile` `prod-deploy` target, the pre-migration backup runs only when the `db` container is running (`$(COMPOSE_PROD) ps --status running -q db`).
  - After `make prod-down`, the `piko-prod_pgdata` volume still holds data but `db` is stopped. `up -d --wait` then starts `db` and runs the one-shot `migrate` service with **no backup**.
  - `docs/ENVIRONMENTS.md` promises that deploy always backs up first.
- **R2: `prod-restore` is unsafe.**
  - It runs `pg_restore --clean --if-exists` without a safety backup of the current data.
  - It does not use `--single-transaction` / `--exit-on-error`, so a failing restore leaves a half-dropped database.
  - It always restarts `api` afterwards (`set +e`), even when the restore failed.
- **R3: the test gate flakes.**
  - `apps/api` has no vitest config, so the default 10 s `hookTimeout` applies.
  - Each service test file boots its own PGlite (WASM Postgres) in `beforeAll`. Under host load that exceeds 10 s. This was seen in the 6-5b, 7-1 and 7-4 reviews.

**R4: correctness bug (rule 12) in `apps/web/src/lib/api/session.ts`.**
- `withSession()` calls `resetSession()` on every `401 session_required`, then `ensureSession()`.
- When two requests fail in parallel, the second `resetSession()` discards the first re-bootstrap while it is still in flight. A second cookie-less `/api/me` is sent, and the server can create a **second guest user**.
- Every API function also repeats `await ensureSession();` before `withSession(...)` by hand: 12 call sites in `decisions.ts`, `shares.ts` and `history.ts`. One omission would break single-flight.

**R5: env guard.** `apps/api/src/env.ts` accepts a `DATABASE_URL` that still contains the `.env.prod.example` placeholder `CHANGE_ME` in production.

## Scope
- R1–R5 below.

## Out of scope (do NOT do)
- Anything in FR-2 … FR-4: the case `play()`, the list store, "Đi thôi" closing, accessibility, IPv6 rate limiting, pruning.
- `docs/**`. The architect updates `ENVIRONMENTS.md` at review; list in the report what the runbook must say.
- New dependencies, compose service changes, Caddy changes, migrations.

## Files to create / modify
- `Makefile`: `prod-deploy` and `prod-restore`.
- `apps/api/vitest.config.ts` (new): timeouts.
- `apps/web/src/lib/api/session.ts`, `decisions.ts`, `shares.ts`, `history.ts`: R4.
- `apps/api/src/env.ts`, `apps/api/src/env.test.ts`: R5.

## Requirements

### R1 — Deploy always backs up existing data
- In `prod-deploy`, before `up -d --wait`, decide by the **data volume**, not by the container state:
  - If the prod data volume exists (`docker volume inspect` on the volume the prod compose project uses for Postgres; read its real name from `compose.prod.yaml` and the project name), make sure `db` is up (`$(COMPOSE_PROD) up -d --wait db`) and run `prod-backup`.
    - If either step fails, stop with a clear message and make **no** further deployment change.
  - If the volume does not exist (first deploy), skip the backup and say so in one line.
- Keep everything else as it is: the image checks, the tag bookkeeping in `.deploy/` and the messages.

### R2 — Safe restore
- **Order in `prod-restore`:**
  1. confirmation prompt (as today)
  2. **safety backup** through `prod-backup`; abort if it fails
  3. stop `api`
  4. `pg_restore --clean --if-exists --no-owner --single-transaction --exit-on-error …`
- **If the restore fails:**
  - leave `api` **stopped**
  - print the safety backup's file name and how to restore it
  - exit non-zero
- **If it succeeds,** start `api` with `up -d --wait api`, as today.

### R3 — Reliable api tests
- Add `apps/api/vitest.config.ts` with `hookTimeout: 30_000` and `testTimeout: 30_000`. Keep the default test discovery and every existing setting the package relies on, and check that the test count is unchanged (50).
- Do not restructure the tests.

### R4 — Session single-flight on the retry path
- **Generation check:** `withSession()` must reset the memoized session **only if the failed request ran under the session promise that is still current**.
  - Capture the current promise (or a generation counter) before the request.
  - On `401 session_required`, reset only if it is still the same.
  - Then `await ensureSession()` and retry once.
  - Two parallel 401s therefore share **one** re-bootstrap `/api/me`.
- **`withSession` awaits `ensureSession()` itself** before the first attempt. Remove the hand-written `await ensureSession();` lines from `decisions.ts`, `shares.ts` and `history.ts`.
  - `ensureSession` stays exported, because `SessionLayout` uses it.
  - Public routes that must not bootstrap a session (`/s/:id` public read) must not go through `withSession`. Check that they don't today.
- Behaviour is otherwise unchanged: one retry only, and errors other than `session_required` propagate.

### R5 — Placeholder guard
- In `envSchema.superRefine`, when `NODE_ENV === 'production'`, add an issue on `DATABASE_URL` if it contains `CHANGE_ME`. Message: `DATABASE_URL still contains the CHANGE_ME placeholder.`
- Add two tests in `env.test.ts`, following the existing style:
  - production with `CHANGE_ME` → rejected
  - development with `CHANGE_ME` → accepted, because dev files may use anything

## Allowed dependencies
- None.

## Acceptance criteria
- [ ] **R1:**
  - With a prod volume present and the stack stopped (`make prod-down`), `make prod-deploy` creates a new file in `backups/` **before** `migrate` runs.
  - Without the volume, it deploys and prints that no backup was needed.
  - Use the local production test mode from `.env.prod.example`.
  - You may create a **local, unpushed** tag such as `v0.0.0-fr1` for `prod-build`, and must delete it afterwards.
  - Report the console output of both runs.
- [ ] **R2:**
  - A restore of a valid dump makes a safety backup, then restores, then the api is healthy.
  - A restore of a corrupt file, for example a truncated dump, fails and leaves the data intact. Check that a row count is unchanged.
  - In the failure case `api` stays stopped and the message names the safety backup.
- [ ] **R3:** `pnpm --filter @piko/api test` passes 3 times in a row while another `make check` runs in parallel (to load the host). Report the 3 results.
- [ ] **R4:**
  - `git grep -n "await ensureSession" -- apps/web/src/lib/api` shows only `session.ts`.
  - In the browser, after clearing cookies, a page that fires several identity-bound requests at once (desktop Home: decisions + recent history) creates exactly **one** guest. Check the `users` row count in the dev DB before and after, and report it.
- [ ] **R5:** the two new env tests pass. api tests total 52.
- [ ] Afterwards, the local prod stack is stopped, test volumes are removed, and the temporary tag is deleted.
- [ ] `make check` passes with 0 lint warnings: domain 48, api 52. Lockfile unchanged.

## Validation
```bash
make check
git grep -n "await ensureSession" -- apps/web/src/lib/api
git diff --stat feat/final-review...
```
- Include the prod-deploy and prod-restore console output for every case above.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `fix/FR-1-release-safety` from `feat/final-review`.
- Commits (suggested):
  - `fix(ops): back up before migrating whenever prod data exists`
  - `fix(ops): safe prod restore`
  - `test(api): raise vitest timeouts for PGlite`
  - `fix(web): single-flight session on the retry path`
  - `fix(api): reject the CHANGE_ME placeholder in production`
- Do not merge or push. Delete any temporary tag.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts and the lint summary
4. Deviations from this handoff and why
5. Known issues / open questions
6. The R1/R2 console output, the R3 three runs, and the R4 guest count before and after
7. What the runbook (`docs/ENVIRONMENTS.md`) should now say about deploy and restore
