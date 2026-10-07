# HANDOFF 1a-1-fix-1 — Review fixes for 1a-1

> Copy everything below this line and give it to the implementer agent.

---

You are the implementer for the project "What Should We Do?" in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Handoff `docs/handoffs/1a-1-monorepo-dev-foundation.md` is implemented. The architect reviewed it and found the issues below. Most of the 1a-1 code is good and must **not** be refactored beyond what is listed here. In particular, leave these as they are:
- session service
- token utils
- rate limiter
- health route
- graceful shutdown
- `createApp` dependency injection
- compose volumes and the Makefile structure

## Scope

### F1 (MUST): Duplicate guest users on first visit

**Evidence:** In the dev DB, each first visit created **two** users about 50ms apart (3 such pairs found).
- **Cause:** `main.tsx` uses `<StrictMode>`, which runs effects twice in dev. `App.tsx` fires `/api/me` with no single-flight, so two cookie-less requests each create a guest. The same race will happen in prod as soon as two identity-bound requests run in parallel on a first visit.
- **Effect:** orphan users and sessions, and in the future, user data split across two identities.

Fix this on the client with a session bootstrap. This is a new architecture rule, now recorded in CLAUDE.md.

**New file `apps/web/src/lib/api/session.ts`**
- Export `ensureSession(): Promise<MeResponseData>`.
- It uses a **module-level memoized promise**, so concurrent and repeated calls share one `/api/me` request.
- If the request fails, clear the memo so a later retry performs a new request.
- Also export `resetSession()` for future logout/account-linking. It only clears the memo.

**Rule:** any future request that depends on identity must `await ensureSession()` first. `/api/healthz` does not need it.

**Rewrite the loading logic in `App.tsx`**
- Remove the `void Promise.resolve().then(() => load())` workaround.
- Use a normal `useEffect` with a cancellation flag (`let cancelled = false` / cleanup sets it), so a StrictMode remount does not set state after cleanup.
- Keep the retry button working.
- Health and session can load in parallel, but `/api/me` must go through `ensureSession()`.
- Keep `<StrictMode>` in `main.tsx`.

### F2 (MUST): Corepack re-downloads pnpm in every container run

**Evidence:**
- `corepack prepare` runs as root, so pnpm is cached in `/root/.cache`.
- Containers run as `node`, whose `~/.cache` does not exist. Every `docker compose run` (`make check`, `db-generate`, …) downloads pnpm again.
- This needs network access, makes runs slower and is not reproducible.
- The `base` stage will be reused by the prod build stages in handoff 1a-2, so fix it now.

**Fix in `docker/Dockerfile`, `base` stage:**
- `ENV COREPACK_HOME=/opt/corepack COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, set **before** `corepack prepare pnpm@10.18.3 --activate`.
- Then `chmod -R a+rX /opt/corepack`, so the `node` user can read it.

Keep everything else in the Dockerfile unchanged.

### F3 (SHOULD): `@types/node` does not match the runtime

`@types/node` is `26.x`, but the runtime is Node 22. Newer type definitions let code use APIs that do not exist at runtime.
- Pin `@types/node` to the latest `22.x` in `apps/api`.

### F4 (SHOULD): Error logging floods on expected client errors

`lib/errors.ts` `onError` calls `console.error(error)` for every error, including expected 4xx errors (429 rate limits, 403 CSRF, 415). Abusive traffic would flood the logs with stack traces.
- Log with full stack only for unknown errors and `HttpError` with status ≥ 500.
- For 4xx errors, log nothing in production. In development, log one line: `status code method path`.

The `onError` signature has access to `c` (context) for the method and path. Extend `onError` to accept `nodeEnv`, for example `createOnError(nodeEnv)`, and wire it in `createApp`.

### F5 (SHOULD): Hard-coded fallback credentials in `drizzle.config.ts`

Remove the fallback URL containing the dev password. If `DATABASE_URL` is missing, throw a clear error.
- `make db-generate` must still work; the container already gets `DATABASE_URL` from `.env.dev`.

### F6 (INVESTIGATE, report only — no code change): Web bundle size

The production web bundle is about **508 kB minified / 151 kB gzip** for a sanity page.
- Measure how much comes from `react` + `react-dom` and how much from `zod` (classic). Also measure what the same schemas would cost with `zod/mini`.
- Run the experiment only in a temporary directory **inside a container** (e.g. `/tmp`). Do not add files to the repo and do not change any dependency.
- Report the numbers. The architect will decide in a separate decision.

## Out of scope (do NOT do)
- Anything in handoff 1a-2 (prod Docker, Caddy) or 1b (design system).
- Changing CSRF middleware, the rate limiter, the session service or the DB schema.
- Adding dependencies.
- Adding render/E2E/smoke tests.
- Git commits.

## Acceptance criteria
- [ ] Count users, open `http://localhost:5173` in a fresh private window (no cookies), wait for load, count again. The count increases by **exactly 1**. Reload: the count does not change.
- [ ] `App.tsx` has no `Promise.resolve().then(...)` workaround and passes `react-hooks` lint without disabling rules.
- [ ] `docker run --rm --network none wswd-dev-install:latest pnpm -v` prints `10.18.3` (works offline, without a download).
- [ ] `@types/node` resolves to `22.x` in `apps/api`.
- [ ] Repeated 429/403/415 responses produce no stack traces in the api logs. A forced 500 still logs a stack trace.
- [ ] `drizzle.config.ts` contains no credentials. `make db-generate` reports "No schema changes" (or equivalent) without errors.
- [ ] `make check` passes.
- [ ] The F6 numbers are reported.

## Validation
Run these and include trimmed output in the report:
```bash
make dev
make db-psql   # select count(*) from users;  (before and after the fresh-window visit)
docker run --rm --network none wswd-dev-install:latest pnpm -v
make db-generate
make check
make dev-logs  # after triggering one 429/403 to show no stack traces (trim)
```

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including the before/after user counts
4. F6 measurements (react-only vs zod classic vs zod/mini, minified and gzip)
5. Acceptance criteria checklist with ✅/❌
6. Deviations and why
7. Known issues / open questions
