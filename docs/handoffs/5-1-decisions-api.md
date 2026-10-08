# HANDOFF 5-1 — Decisions API (table, CRUD, ownership)

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-012**, **D-013**, **D-016**, **D-024** and **D-029** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies beyond those listed.
- Stop and report if anything conflicts.

## Context

Phase 5 adds the decision builder: users create, edit, save and delete their own decisions.
- This task is the server side only: the domain request/response schemas, the `decisions` table, the service layer, the routes and their tests.
- The web builder comes in 5-2. Do not touch `apps/web`.

Today the API has:
- `GET /api/healthz`
- `GET /api/me`, which creates a guest user plus a session when the request has no valid cookie

The tables are `users` and `sessions` (`apps/api/src/db/schema.ts`). `make check` runs **without** a database container (`--no-deps`).

The owner chose **PGlite** (in-process PostgreSQL in WASM) so the service and ownership tests run against the real migrations without a container (D-029).

## Scope
- A. Domain: `DecisionDraft` schema, the API response schemas, and the per-user limit.
- B. DB: the `decisions` table and its generated migration.
- C. Session middleware option: routes that require an existing session.
- D. Service: `decisions.service.ts`.
- E. Routes: `/api/decisions` CRUD.
- F. Tests on PGlite.

## Out of scope (do NOT do)
- Any change in `apps/web`, Docker, compose, Caddy or the Makefile.
- History, sessions of decisions, feedback, sharing (Phase 6).
- Pagination, search, filtering by category, optimistic concurrency (`If-Match`/version), soft delete.
- Changes to `select`, the animation plan, or existing `Decision` behaviour.
- Any dependency other than the one listed below.

## Allowed dependencies
- `@electric-sql/pglite` `0.5.8`, pinned exactly, in `apps/api` **devDependencies**. Reason: D-029. Drizzle `0.45.3` already ships the `drizzle-orm/pglite` driver and migrator.
- Nothing else. The lockfile changes only for PGlite (and drizzle-orm's resolution key, because PGlite is one of its optional peers).
- Install it inside the dev container, e.g. `docker compose -f compose.dev.yaml run --rm --no-deps install pnpm --filter @piko/api add -D -E @electric-sql/pglite@0.5.8`.

## Files to create / modify
- `packages/domain/src/decision/limits.ts`: add `maxDecisionsPerUser: 100`
- `packages/domain/src/decision/schemas.ts`: add `DecisionDraft`
- `packages/domain/src/decision/schemas.test.ts`: tests for `DecisionDraft`
- `packages/domain/src/api/decisions.ts` (new): `DecisionRecord`, `DecisionListResponse`
- `packages/domain/src/index.ts`: exports
- `apps/api/package.json`, `pnpm-lock.yaml`: PGlite
- `apps/api/src/db/schema.ts`: the `decisions` table + relations
- `apps/api/drizzle/0001_*.sql` + `meta/*`: **generated** with `make db-generate`, never hand-written
- `apps/api/src/db/client.ts`: the shared `Database` type (see C)
- `apps/api/src/auth/session.middleware.ts`: the `allowGuestCreation` option
- `apps/api/src/services/decisions.service.ts` (new)
- `apps/api/src/routes/decisions.ts` (new)
- `apps/api/src/app.ts`: mount the routes
- `apps/api/src/test/pglite.ts` (new): the test database helper
- `apps/api/src/services/decisions.service.test.ts` (new)
- `apps/api/src/routes/decisions.test.ts` (new)

## Requirements

### A — Domain
1. `DECISION_LIMITS.maxDecisionsPerUser = 100`.
2. `DecisionDraft` is a decision **without `id`**: `title`, `category?`, `options`, with exactly the same field rules and the same three refinements as `Decision`:
   - `duplicate_option_id`
   - `duplicate_option_label`
   - `not_enough_enabled_options`

   `Decision` keeps its current behaviour and output type. Share the field shape and the refinements between both schemas: do not copy them.
   - zod 4 refuses to `extend` an object that carries refinements, so build both from one plain shape object and apply the same checks to each.
   - The existing domain tests must pass unchanged.
3. `packages/domain/src/api/decisions.ts`:
   ```ts
   export const DecisionRecord = z.object({
     decision: Decision,
     createdAt: z.iso.datetime(),
     updatedAt: z.iso.datetime(),
   });
   export const DecisionListResponse = z.object({ decisions: z.array(DecisionRecord) });
   ```
   Export both schemas and their `…Data` types from `index.ts`, following the existing pattern. Also export `DecisionDraft` and `DecisionDraftData`.
4. Tests (in `schemas.test.ts`):
   - `DecisionDraft` accepts a valid draft and strips an unknown `id` key.
   - It reports `duplicate_option_label` and `not_enough_enabled_options`, like `Decision`.

   Keep it to about 3 tests.

### B — Table `decisions` (`schema.ts`)
| Column | Type |
|---|---|
| `id` | `uuid`, primary key, `defaultRandom()` |
| `user_id` | `uuid`, not null, FK → `users.id`, `onDelete: 'cascade'` |
| `title` | `text`, not null |
| `category` | `text`, nullable |
| `options` | `jsonb`, not null, typed with `.$type<DecisionOptionData[]>()` |
| `created_at` | `timestamptz`, not null, `defaultNow()` |
| `updated_at` | `timestamptz`, not null, `defaultNow()` |

- Add the index `decisions_user_id_updated_at_idx` on `(user_id, updated_at)`.
- Add `relations`: users have many decisions, a decision has one user. Export `DecisionRow`.
- Generate the migration with `make db-generate`. It must be **additive only**: one `CREATE TABLE`, the FK and the index. No change to `users`/`sessions` (D-016).
- Then run `make db-migrate`, or restart the api container, which migrates on start, so the dev DB has the table.

### C — Shared `Database` type and required sessions
1. `client.ts`: the services must accept both the postgres-js Drizzle instance and a PGlite Drizzle instance.
   - Change the exported `Database` type to the common Drizzle base type, e.g. `PgDatabase<PgQueryResultHKT, typeof schema>` from `drizzle-orm/pg-core`.
   - `createDb` keeps returning the postgres-js instance.
   - The existing session code must still typecheck.
   - **If this needs `as` casts or `any`, stop and report** with the compiler error.
2. `createSessionMiddleware` gets a new option `allowGuestCreation: boolean`.
   - `true` keeps today's behaviour, and `/api/me` passes `true`.
   - With `false`, a request without a valid session throws `HttpError(401, 'session_required', 'A session is required.')`. It never touches the rate limiter, never creates a user, and never sets a cookie.
   - A valid session is resolved and touched exactly as today.

### D — Service (`services/decisions.service.ts`)
Every function takes `db` and the session's `userId`. **Every query filters by `user_id`** (D-013, rule 6).

```ts
listDecisions(db, userId): Promise<DecisionRecordData[]>                      // updated_at desc, then id asc
getDecision(db, userId, id): Promise<DecisionRecordData | null>
createDecision(db, userId, draft: DecisionDraftData, now?: Date): Promise<DecisionRecordData>
updateDecision(db, userId, id, draft: DecisionDraftData, now?: Date): Promise<DecisionRecordData | null>
deleteDecision(db, userId, id): Promise<boolean>
```
- `null` / `false` means "not found **or** not owned". The caller cannot tell the two apart.
- `createDecision`:
  - Run it in one transaction.
  - Lock the user's row (`SELECT … FROM users WHERE id = $1 FOR UPDATE`).
  - Count the user's decisions. If the count is already `≥ DECISION_LIMITS.maxDecisionsPerUser`, throw `HttpError(409, 'decision_limit_reached', 'You have reached the maximum number of decisions.')`.
  - Otherwise insert, with `createdAt = updatedAt = now`.
- `updateDecision`:
  - Replace `title`, `category` and `options`, and set `updatedAt = now`.
  - `createdAt` and `id` never change.
  - Use one `UPDATE … WHERE id AND user_id … RETURNING`.
- `deleteDecision`: one `DELETE … WHERE id AND user_id … RETURNING id`.
- Store `category` as `null` when the draft has none. Map a row back to `DecisionRecordData`: omit `category` when it is null, and use ISO strings for the timestamps.
  - Do not re-validate rows on read: they were validated on write.
- The draft passed in is already parsed by `DecisionDraft`, so it is NFC-normalized and trimmed. Store exactly that.

### E — Routes (`routes/decisions.ts`, mounted in `app.ts`)
| Method | Path | Success |
|---|---|---|
| `GET` | `/api/decisions` | 200 `DecisionListResponse` |
| `POST` | `/api/decisions` | 201 `DecisionRecord` |
| `GET` | `/api/decisions/:id` | 200 `DecisionRecord` |
| `PUT` | `/api/decisions/:id` | 200 `DecisionRecord` |
| `DELETE` | `/api/decisions/:id` | 204, empty body |

- **Session:** mount the session middleware with `allowGuestCreation: false` on `/api/decisions` and `/api/decisions/*`.
- **Body limit:** apply `bodyLimit` from `hono/body-limit` with a 16 KB maximum on the same paths. Over the limit → `HttpError(413, 'payload_too_large', 'The request body is too large.')`.
- **The `:id` param:** parse it with `z.uuid()`. When it is not a UUID, return a **404** `not_found`, the same as for a missing decision.
- **The body:**
  - Read the raw JSON. Invalid JSON → 400 `invalid_json`.
  - Parse it with `DecisionDraft.safeParse`. On failure → 400 `invalid_body` with the message `The decision is invalid.`
  - Do not echo the zod issues; the web validates with the same schema before sending.
- Not found or not owned → 404 `not_found`, via `HttpError`, with the same JSON error shape as today.
- Build responses as typed `DecisionRecordData` / `DecisionListResponseData` values, like `meHandler`.
- Keep handlers thin: parse, call the service, respond.
- The existing global middleware already enforces `application/json` and the `Origin` check on mutations. Do not duplicate it.

### F — Tests (PGlite)
1. `test/pglite.ts`:
   - `createTestDatabase()` creates `new PGlite()` and wraps it with `drizzle(client, { schema })` from `drizzle-orm/pglite`.
   - It applies the real migrations with `migrate` from `drizzle-orm/pglite/migrator`, from `apps/api/drizzle`, resolving the path relative to the helper file.
   - It returns `{ db, close }`.
   - It is test-only code: it must not be imported by `src/index.ts`, `migrate.ts` or anything they import, so tsup never bundles it.
2. `decisions.service.test.ts`: one database per file (`beforeAll`/`afterAll`). Each test creates its own users through `createGuestSession`, so tests do not depend on each other. Cover:
   - create, then get and list return it. The JSONB round trip keeps the option order and `emoji`, `weight` and `enabled`. `category` is absent when it was not given.
   - list returns only the caller's decisions, ordered by `updatedAt` desc (use injected `now` values).
   - **Ownership:** user B gets `null` from `getDecision`/`updateDecision` and `false` from `deleteDecision` for user A's decision, and A's decision is unchanged afterwards.
   - update replaces the content, bumps `updatedAt` and keeps `createdAt`.
   - delete removes it; a second delete returns `false`.
   - the limit: with `maxDecisionsPerUser` decisions already stored, the next create throws a 409 `decision_limit_reached`, and another user can still create. Insert the 100 rows with one bulk insert in the test setup, not 100 service calls.
   - deleting the user cascades to their decisions.
3. `routes/decisions.test.ts`:
   - Build the app with `createApp` on the PGlite `db`.
     - Pass the `sql` dependency in a typed way, e.g. a narrow test stub of the type `healthHandler` needs. **No `as any`.**
     - If `AppDependencies` must be narrowed to make this possible, do it minimally and report it.
   - Use a cookie from `createGuestSession` and `app.request(...)` with the right `Origin`/`Content-Type` headers. Cover:
     - `GET /api/decisions` without a cookie → 401 `session_required`, and no new row in `users`
     - `GET /api/decisions/not-a-uuid` → 404
     - `POST` with an invalid draft → 400 `invalid_body`; with malformed JSON → 400 `invalid_json`
     - `POST` with a body over 16 KB → 413
     - `POST` valid → 201, and `DecisionRecord.parse` accepts the response; `DELETE` → 204 with an empty body
4. Do not write render/snapshot/E2E/curl tests (Testing policy in CLAUDE.md).

## Acceptance criteria
- [ ] `@electric-sql/pglite` `0.5.8` is the only new dependency, and it is a devDependency of `apps/api`.
- [ ] The migration is generated, additive only, and applied in dev.
- [ ] All five routes behave as specified. Another user's decision is always a 404.
- [ ] `/api/decisions*` never creates a guest user.
- [ ] `/api/me` behaves exactly as before.
- [ ] `Decision` behaviour and all existing tests are unchanged. `DecisionDraft` shares the shape and refinements.
- [ ] No `as any`, no `@ts-expect-error`, no non-null `!` assertions added.
- [ ] `make check` passes, including the new tests.
- [ ] The `api-prod` image still builds from `HEAD`. It does not contain PGlite, and its size is reported.

## Validation
Run and include the output in the report:
```bash
make check
make db-migrate
git archive --format=tar HEAD | docker build -f docker/Dockerfile --target api-prod -t piko-api:5-1-check -
docker run --rm --entrypoint sh piko-api:5-1-check -c 'ls node_modules/@electric-sql 2>/dev/null || echo "no pglite"'
docker image inspect piko-api:5-1-check --format '{{.Size}}'
docker image rm piko-api:5-1-check
git diff --stat feat/phase-5-builder...HEAD
cat apps/api/drizzle/0001_*.sql
```
- The image build is the `api-prod` step of `make prod-build`, run on your committed `HEAD` (it needs no `.env.prod` and no git tag). If the image entrypoint or working directory differs from the command above, adapt it and report the exact command.
- Restart the api after migrating if needed: `docker compose -f compose.dev.yaml restart api`.

## Git
- Create branch `feat/5-1-decisions-api` from **`feat/phase-5-builder`**.
- Use small logical commits, e.g.:
  - `feat(domain): add decision draft and API schemas`
  - `feat(api): add decisions table`
  - `feat(api): add decisions CRUD with ownership`
  - `test(api): run decision service tests on PGlite`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed): `make check` with test counts, the migration SQL, the prod image check
4. Deviations from this handoff and why (especially the `Database` type and `AppDependencies`)
5. Known issues / open questions
6. No visual review for this task (API only).
