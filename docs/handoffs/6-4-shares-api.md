# HANDOFF 6-4 — Shares API (shared cases, owner routes, public read)

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-005**, **D-013**, **D-016**, **D-029** and **D-030** in `docs/DECISIONS.md`. D-030 has a section "Shares API defaults (6-4)" written for this task. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 6 adds sharing (D-030). A user can share a case as a **public link**. Anyone with the URL can open it without an account.
- This task is the **server side only**: the domain schemas, the `shared_cases` table, the services, the routes and their tests.
- The web UI (the "Chia sẻ" dialog and the public page `/s/:id`) is task 6-5.
- Live viewing over SSE is task 6-6.
- Do not touch `apps/web`.

**What exists. The history API (6-1) is the closest pattern:**
- **`packages/domain`:**
  - `DecisionDraft` and `DecisionOption` (`decision/schemas.ts`)
  - `SelectionResult` (`selection/result.ts`)
  - `matchesSelection(options, result)` (`selection/match.ts`)
  - `DECISION_LIMITS` (`decision/limits.ts`)
  - the API schemas in `src/api/`, exported from `src/index.ts`
- **`apps/api`:**
  - `routes/history.ts` (thin) and `services/history.service.ts`. The service re-checks the result with `matchesSelection` and locks the user row `FOR UPDATE` in its transaction.
  - `app.ts` mounts `jsonBodyLimit` (16 KB) and `requiredSession` (`allowGuestCreation: false` → `401 session_required`) on each owner route prefix.
  - `HttpError`. The decisions routes turn a malformed id into the same `404 not_found` as a missing one.
  - PGlite tests (`test/pglite.ts`, `test/decisions.fixtures.ts`: `makeDraft`, `makeOption`), with users from `createGuestSession`.
  - Migrations are generated with `make db-generate` and must be additive (D-016).

**D-030 sharing rules:**
- A link points to a **shared case**: a snapshot of the title and options, plus the **latest spin** (a `SelectionResult`).
  - The result is optional when the link is created. Live viewing (6-6) allows sharing before the first spin.
  - The sharer may spin again after sharing. Each spin can change the `enabled` flags ("Không phải hôm nay"), so a recorded spin carries its own options and is re-checked on the server.
- **Lifetime is chosen when sharing:** 1 day, 7 days (the UI default), 30 days, or no expiry.
- **The owner can revoke a link.** An expired or revoked link reads as "no longer available".
- **The link id is a random UUID** (unguessable).
- **Opening a shared link never creates a guest user.**
- Links are deleted with their user (cascade).
- **Public data:** never the owner's id or any other user data.

**Defaults recorded in D-030 for this task:**
- **Revoke deletes the row.** A revoked link and an unknown link both answer `404`, so they are indistinguishable.
- **Expired rows are filtered on read** and deleted when the same user creates a new link.
- **At most 50 active links per user** → `409 share_limit_reached`.
- **The public route is `GET /api/public/shares/:id`.** It is sessionless and sends `Cache-Control: no-store`, so a revoke takes effect at once.
- **The public response includes the option weights.** Replay and "Tự quay thử" must run the same engine with the same weights (D-005). The UI never displays them (D-010).

## Scope
- A. Domain: limits, lifetimes and the share schemas.
- B. DB: the `shared_cases` table and its generated migration.
- C. Services: owner and public functions in `shares.service.ts`.
- D. Routes: owner routes under `/api/shares` and the public route.
- E. Tests on PGlite.

## Out of scope (do NOT do)
- `apps/web`, Docker, compose, Caddy, the Makefile.
- SSE, live events, viewer interactions (6-6).
- Editing a share's title or options, renaming, extending a lifetime, view counters, analytics.
- Rate limiting the public route. UUID v4 ids are not enumerable; revisit in Phase 9 if needed.
- Changes to `select`, `matchesSelection`, the decision schemas, or the decisions/history behaviour.
- New dependencies.

## Files to create or modify
- `packages/domain/src/decision/limits.ts`: add `maxActiveSharesPerUser: 50`
- `packages/domain/src/api/shares.ts` (new)
- `packages/domain/src/index.ts`: exports
- `apps/api/src/db/schema.ts`: the table and its relations
- `apps/api/drizzle/0003_*.sql` + `meta/*`: **generated** with `make db-generate`, never hand-written
- `apps/api/src/services/shares.service.ts` (new) + `shares.service.test.ts` (new)
- `apps/api/src/routes/shares.ts` (new) + `shares.test.ts` (new): owner and public routers in one file
- `apps/api/src/app.ts`: mount them
- `apps/api/src/test/decisions.fixtures.ts`: add a share fixture helper only if it is used by both test files

## Requirements

### A — Domain
**`DECISION_LIMITS`:** add `maxActiveSharesPerUser = 50`.

**`api/shares.ts`** (zod/mini, like `api/history.ts`):
```ts
export const SHARE_LIFETIME_DAYS = { '1d': 1, '7d': 7, '30d': 30, never: null } as const;
export const ShareLifetime = z.enum(['1d', '7d', '30d', 'never']);

const spinOptions = z.array(DecisionOption).check(
  z.minLength(DECISION_LIMITS.minOptions),
  z.maxLength(DECISION_LIMITS.maxOptions),
);

export const SharedCaseCreate = z.object({
  decision: DecisionDraft,            // title, optional category, options as passed to select
  result: z.nullable(SelectionResult),
  lifetime: ShareLifetime,
});

export const SharedCaseSpin = z.object({
  options: spinOptions,               // the options of this spin, enabled flags included
  result: SelectionResult,
});

export const SharedCase = z.object({
  id: z.uuid(),
  title: z.string(),
  category: z.optional(z.string()),
  options: z.array(DecisionOption),
  result: z.nullable(SelectionResult),
  spunAt: z.nullable(z.iso.datetime()),
  createdAt: z.iso.datetime(),
  expiresAt: z.nullable(z.iso.datetime()),
});

export const SharedCaseListResponse = z.object({ shares: z.array(SharedCase) });
```
- **One `SharedCase` shape serves the owner routes and the public route.** It has no user field, so nothing private can leak through it.
- Export every schema, `SHARE_LIFETIME_DAYS` and the `…Data` types from `index.ts`, following the existing pattern.
- No schema tests; the route tests parse the responses.

### B — Table `shared_cases` (`schema.ts`)

| Column | Type |
|---|---|
| `id` | `uuid`, primary key, `defaultRandom()` |
| `user_id` | `uuid`, not null, FK → `users.id`, `onDelete: 'cascade'` |
| `title` | `text`, not null |
| `category` | `text`, nullable |
| `options` | `jsonb`, not null, `.$type<DecisionOptionData[]>()` |
| `result` | `jsonb`, nullable, `.$type<SelectionResultData>()` |
| `spun_at` | `timestamptz`, nullable |
| `created_at` | `timestamptz`, not null, `defaultNow()` |
| `expires_at` | `timestamptz`, nullable (`null` = never expires) |

- Index `shared_cases_user_id_created_at_idx` on `(user_id, created_at)`.
- `relations`: users have many `sharedCases`; a shared case has one user. Export `SharedCaseRow`.
- The migration must be **additive only**: one `CREATE TABLE`, one FK, one index.
- Apply it in dev with `make db-migrate`, or restart the api.

### C — Service (`services/shares.service.ts`)
**General rules:**
- Owner functions take `db` and the session's `userId`, and **every query filters by `user_id`** (rule 6).
- Every function takes `now: Date = new Date()` so tests can inject time.
- A share is **active** when `expires_at IS NULL OR expires_at > now`.

```ts
createShare(db, userId, input: SharedCaseCreateData, now?): Promise<SharedCaseData>
listShares(db, userId, now?): Promise<SharedCaseData[]>                // active only, created_at desc, id asc
revokeShare(db, userId, shareId: string): Promise<void>                 // 404 when not owned / unknown
recordShareSpin(db, userId, shareId: string, input: SharedCaseSpinData, now?): Promise<SharedCaseData>
getPublicShare(db, shareId: string, now?): Promise<SharedCaseData>      // no userId: public
```

**`createShare`:**
1. If `input.result` is not `null` and `!matchesSelection(input.decision.options, input.result)`, throw `HttpError(400, 'invalid_result', 'The result does not match the options.')`.
2. In one transaction:
   - Lock the user row `FOR UPDATE`.
   - Delete the user's **expired** rows.
   - Count the user's remaining rows. If the count is `>= maxActiveSharesPerUser`, throw `HttpError(409, 'share_limit_reached', 'The share limit has been reached.')`.
   - Insert the row:
     - `title`, `category` (or `null`), `options` exactly as sent
     - `result` (or `null`)
     - `spun_at = now` when there is a result, otherwise `null`
     - `created_at = now`
     - `expires_at = now + SHARE_LIFETIME_DAYS[lifetime] days`, or `null` for `never`
3. Return the record. Do not re-read it.

**`listShares`:** the caller's active rows, newest first.

**`revokeShare`:** `DELETE … WHERE id AND user_id`.
- If nothing was deleted, throw the decisions-style `404 not_found`.
- Expired rows can still be revoked.

**`recordShareSpin`:**
1. In one transaction, select the row `WHERE id AND user_id` and **active**, with `FOR UPDATE`. If there is none, throw `404 not_found`.
2. **The option set must not change:**
   - `input.options` has the same length as the stored options
   - the same ids in the same order
   - the same `label`, `emoji` and `weight`
   - only `enabled` may differ

   Otherwise throw `HttpError(400, 'invalid_options', 'The options do not match the shared case.')`. Write this comparison as one small local function.
3. If `!matchesSelection(input.options, input.result)`, throw `400 invalid_result`.
4. Update `options = input.options`, `result = input.result`, `spun_at = now`. Return the updated record.

**`getPublicShare`:**
- Select by id with **no user filter**, and only when active.
- If there is none, throw `404 not_found`. Unknown, revoked and expired ids look the same.

**Row → `SharedCaseData`:**
- ISO strings for the dates.
- `category` is omitted when it is `null`.
- No user id.
- Do not re-validate rows on read.

### D — Routes (`routes/shares.ts`)
**Owner routes**, under `/api/shares`. In `app.ts`, mount `jsonBodyLimit` and `requiredSession` on `/api/shares` and `/api/shares/*`, like `/api/history`:

| Method | Path | Body | Success |
|---|---|---|---|
| `POST` | `/api/shares` | `SharedCaseCreate` | 201 `SharedCase` |
| `GET` | `/api/shares` | — | 200 `SharedCaseListResponse` |
| `DELETE` | `/api/shares/:id` | — | 204, empty body |
| `POST` | `/api/shares/:id/spins` | `SharedCaseSpin` | 200 `SharedCase` |

- **Malformed `:id`** (not a UUID) → the same `404 not_found` as the decisions routes.
- **Bodies:**
  - invalid JSON → 400 `invalid_json`
  - a failed `safeParse` → 400 `invalid_body`, with the message `The shared case is invalid.` for create and `The spin is invalid.` for spins
  - do not echo zod issues
- `DELETE` needs no body, but it still passes the existing mutation guard (JSON content type + Origin), as `DELETE /api/decisions/:id` does today.

**Public route:** `GET /api/public/shares/:id` → 200 `SharedCase`.
- **No session middleware on `/api/public/*`.** The route must not read, create or refresh a session, and must not set a cookie.
- Malformed or unknown ids → `404 not_found`.
- Set `Cache-Control: no-store` on **both** the 200 and the 404 response.

**General:**
- Build typed responses as the history routes do.
- Keep handlers thin.
- Export a single factory with both routers or two factories; you choose, but keep one file.

### E — Tests (PGlite)
Follow the setup of `history.service.test.ts` / `history.test.ts`: one database per file, users from `createGuestSession`, and independent tests. Build valid results with `select(options, seed)`.

**1. `shares.service.test.ts`:**
- **create:**
  - with a result: the record has the result, `spunAt = now`, and `expiresAt = now + 7 days` for `'7d'`
  - with `result: null`: `spunAt` and `result` are null
  - `'never'` gives `expiresAt: null`
  - a mismatched result → `400 invalid_result`, and nothing is stored
- **limit:**
  - with 50 active rows (bulk insert in the setup), a create → `409 share_limit_reached`
  - with 50 rows of which one is expired, a create succeeds and the expired row is deleted
- **list:** only the caller's **active** rows, newest first. Another user's rows and expired rows are absent.
- **revoke:**
  - the owner can revoke
  - another user's id → 404, and the row still exists
  - an unknown id → 404
- **spins:**
  - a valid spin with one option switched to `enabled: false` updates `options`, `result` and `spunAt`
  - a changed label, a changed weight, a missing option or a reordered option → `400 invalid_options`
  - a mismatched result → `400 invalid_result`
  - another user's share, or an expired share → 404
- **public read:**
  - an active share is returned with no user field
  - expired, revoked and unknown ids → 404
- **cascade:** deleting the user deletes their shares.

**2. `shares.test.ts`** (routes through `createApp`, as `history.test.ts` does):
- **Every owner route** without a cookie → `401 session_required`.
- **One happy path through the owner routes:**
  - create → 201
  - the response parses with `SharedCase`
  - `GET /api/shares` lists it
  - a spin → 200
  - `DELETE` → 204
  - the list is empty
- **Malformed ids** (owner and public) → 404.
- An invalid create body → `400 invalid_body`.
- **Public route, without any cookie:**
  - 200, and the response parses with `SharedCase`
  - `Cache-Control: no-store`
  - **no `Set-Cookie` header**
  - **the `users` row count is unchanged**, so no guest was created
  - after a revoke: 404, also with `Cache-Control: no-store`

## Acceptance criteria
- [ ] The migration is additive: `CREATE TABLE shared_cases`, one FK, one index. It is applied in dev.
- [ ] `git grep -n "createSessionMiddleware\|requiredSession" -- apps/api/src/app.ts` shows no session middleware on `/api/public`.
- [ ] The public route sets no cookie and creates no user. Tests prove both.
- [ ] Every owner query filters by `user_id`; only `getPublicShare` does not.
- [ ] `make check` passes. The domain count is unchanged (48). The api count grows; report it.
- [ ] No new dependency; lockfile unchanged.

## Validation
Run and include the output in the report:
```bash
make db-generate        # once, after the schema change
make check
cat apps/api/drizzle/0003_*.sql
git grep -n "/api/public" -- apps/api/src
git diff --stat feat/phase-6-result-history...HEAD
```
Optional manual check in dev:
```bash
curl -si localhost:5173/api/public/shares/00000000-0000-4000-8000-000000000000
```
It should be a 404 with `Cache-Control: no-store` and no `Set-Cookie`. Do not print secrets from `.env.dev`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `feat/6-4-shares-api` from `feat/phase-6-result-history`.
- Make these commits, in this order:
  1. `feat(domain): add shared case schemas and limits`
  2. `feat(api): add shared_cases table and migration`
  3. `feat(api): add share routes and public read`, for the service, the routes and `app.ts`
  4. `test(api): cover share service and routes`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including:
   - the migration SQL
   - the test counts
   - the headers of one public 200 and one public 404
4. Deviations from this handoff and why
5. Known issues / open questions
6. No visual review for this task (API only).
