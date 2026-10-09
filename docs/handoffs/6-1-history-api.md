# HANDOFF 6-1 — History API (table, create/list, server re-check)

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-005**, **D-017**, **D-024**, **D-029** and **D-030** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 6 adds result actions and history. When the user taps "Đi thôi" on a revealed result, the web will save a **history entry** (best-effort; built in 6-2). This task is the server side only:
- the domain schemas
- the `decision_sessions` table
- the service, the routes and their tests

Do not touch `apps/web`.

What exists:
- **`packages/domain`:**
  - `DecisionDraft` (a decision without `id`)
  - `DecisionOption`
  - `select(options, seed)`, which returns `SelectionResult { algorithm, seed, winnerId, candidateIds }`. `candidateIds` are the enabled options, in option order.
  - `DECISION_LIMITS`
  - the API schemas in `src/api/`
- **`apps/api`:** the `decisions` CRUD from 5-1, which is the pattern to follow:
  - `routes/decisions.ts` (thin) and `services/decisions.service.ts`
  - `createSessionMiddleware({ allowGuestCreation: false })`, which returns a 401 `session_required`
  - a 16 KB `bodyLimit`
  - `HttpError`
  - PGlite tests (`test/pglite.ts`, `test/decisions.fixtures.ts`)

D-030 history rules:
- An entry is a **snapshot**:
  - its source: a saved decision, a preset, or an unsaved builder draft
  - the title
  - the options **exactly as they were passed to `select`**, with disabled options included and `enabled: false`
  - the `SelectionResult`
- The server **re-runs `select(options, seed)`** and rejects a result that does not match.
- A `decision_id` that is missing or not owned by the caller is stored as `null`, without an error.
- When the decision is deleted later, the link becomes `null` (`ON DELETE SET NULL`).
- At most 200 entries per user; the oldest are pruned on insert.

## Scope
- A. Domain: the limit, `matchesSelection`, the history API schemas.
- B. DB: the `decision_sessions` table and its generated migration.
- C. Service: `history.service.ts`.
- D. Routes: `GET`/`POST /api/history`.
- E. Tests on PGlite.

## Out of scope (do NOT do)
- Any change in `apps/web`, Docker, compose, Caddy or the Makefile.
- Deleting history entries, pagination cursors, feedback, rejected or unaccepted spins.
- Share links and live viewing (6-4…6-6).
- Changes to `select`, `Decision`/`DecisionDraft` behaviour, the animation plan, or the `decisions` routes' behaviour.
- New dependencies.

## Files to create / modify
- `packages/domain/src/decision/limits.ts`: add `maxHistoryEntriesPerUser: 200`
- `packages/domain/src/selection/match.ts` (new) + `match.test.ts` (new): `matchesSelection`
- `packages/domain/src/api/history.ts` (new): the history schemas
- `packages/domain/src/index.ts`: exports
- `apps/api/src/db/schema.ts`: the table, the enum and the relations
- `apps/api/drizzle/0002_*.sql` + `meta/*`: **generated** with `make db-generate`, never hand-written
- `apps/api/src/services/history.service.ts` (new) + `history.service.test.ts` (new)
- `apps/api/src/routes/history.ts` (new) + `history.test.ts` (new)
- `apps/api/src/app.ts`: mount the routes
- `apps/api/src/test/decisions.fixtures.ts`: add a history fixture helper, if useful

## Requirements

### A — Domain
1. Add `DECISION_LIMITS.maxHistoryEntriesPerUser = 200`.
2. `selection/match.ts`:
   ```ts
   export function matchesSelection(
     options: readonly DecisionOptionData[],
     result: SelectionResultData,
   ): boolean;
   ```
   - It returns `true` only when `select(options, result.seed)` gives the same `algorithm`, the same `winnerId` and the same `candidateIds` (same ids, same order).
   - When `select` throws (fewer than two enabled options), it returns `false`.
   - It is pure and framework-free. Export it from `index.ts`.
   - `match.test.ts`, about 3 tests:
     - `true` for the output of `select`
     - `false` for a different `winnerId` taken from the candidates
     - `false` when the candidates differ from the enabled options, e.g. an option that was enabled for the spin is sent as disabled
3. `api/history.ts`:
   ```ts
   export const HistorySourceInput = z.discriminatedUnion('kind', [
     z.object({ kind: z.literal('decision'), decisionId: z.uuid() }),
     z.object({ kind: z.literal('preset'), slug: /* ^[a-z0-9-]{1,32}$ */ }),
     z.object({ kind: z.literal('draft') }),
   ]);
   export const HistoryEntryCreate = z.object({
     source: HistorySourceInput,
     decision: DecisionDraft,     // title + options as passed to select; category ignored
     result: SelectionResult,
   });
   export const HistorySource = /* as HistorySourceInput, but decisionId is z.nullable(z.uuid()) */;
   export const HistoryEntry = z.object({
     id: z.uuid(),
     source: HistorySource,
     title: z.string(),
     winner: DecisionOption,
     createdAt: z.iso.datetime(),
   });
   export const HistoryListResponse = z.object({ entries: z.array(HistoryEntry) });
   ```
   - Use `zod/mini`, like the other domain schemas.
   - Export every schema and its `…Data` type from `index.ts`, following the existing pattern.
   - The list item does **not** include the options. The snapshot is stored, but not returned in this task.
   - No extra schema tests are needed beyond `match.test.ts`; the route tests parse the responses.

### B — Table `decision_sessions` (`schema.ts`)
- Add the enum `decision_session_source`: `'decision' | 'preset' | 'draft'`.

| Column | Type |
|---|---|
| `id` | `uuid`, primary key, `defaultRandom()` |
| `user_id` | `uuid`, not null, FK → `users.id`, `onDelete: 'cascade'` |
| `source` | `decision_session_source`, not null |
| `decision_id` | `uuid`, nullable, FK → `decisions.id`, `onDelete: 'set null'` |
| `preset_slug` | `text`, nullable |
| `title` | `text`, not null |
| `options` | `jsonb`, not null, `.$type<DecisionOptionData[]>()` |
| `result` | `jsonb`, not null, `.$type<SelectionResultData>()` |
| `created_at` | `timestamptz`, not null, `defaultNow()` |

- Indexes:
  - `decision_sessions_user_id_created_at_idx` on `(user_id, created_at)`
  - `decision_sessions_decision_id_idx` on `(decision_id)`, so the set-null on delete is not a full scan
- `relations`: users have many `decisionSessions`; an entry has one user and one (optional) decision. Export `DecisionSessionRow`.
- Generate the migration with `make db-generate`. It must be **additive only**: the enum, one `CREATE TABLE`, two FKs and two indexes. No change to the existing tables (D-016).
- Apply it in dev with `make db-migrate`, or restart the api.

### C — Service (`services/history.service.ts`)
Every function takes `db` and the session's `userId`. **Every query filters by `user_id`** (rule 6).

```ts
listHistory(db, userId, limit: number): Promise<HistoryEntryData[]>   // created_at desc, then id asc
createHistoryEntry(db, userId, input: HistoryEntryCreateData, now?: Date): Promise<HistoryEntryData>
```
- **`createHistoryEntry`:**
  1. If `!matchesSelection(input.decision.options, input.result)`, throw `HttpError(400, 'invalid_result', 'The result does not match the options.')` and store nothing.
  2. In one transaction:
     - Lock the user's row (`FOR UPDATE`), as `createDecision` does.
     - For a `decision` source: select the decision `WHERE id AND user_id`. Store its id when found, otherwise `null`.
     - Insert the row:
       - `source`
       - `decision_id` / `preset_slug`; only the one that matches the source kind, the other is `null`
       - `title`
       - `options`: exactly `input.decision.options`
       - `result`
       - `createdAt = now`
     - Prune: delete the user's rows that are not among the newest `maxHistoryEntriesPerUser`, using the **same order as the list** (`created_at desc, id asc`).
  3. Return the entry. Do not re-read it.
- **Row → `HistoryEntryData`:**
  - `source` is rebuilt from `source` + `decision_id` / `preset_slug`. A `decision` source whose `decision_id` became `null` gives `{ kind: 'decision', decisionId: null }`.
  - `winner` is the option of `options` whose id is `result.winnerId`. If it is missing, throw a plain `Error`; the server check makes this impossible.
  - `createdAt` is an ISO string.
  - Do not re-validate rows on read.
- `input.decision.category` is ignored. There is no column for it.

### D — Routes (`routes/history.ts`, mounted in `app.ts`)
| Method | Path | Success |
|---|---|---|
| `GET` | `/api/history?limit=<n>` | 200 `HistoryListResponse` |
| `POST` | `/api/history` | 201 `HistoryEntry` |

- **Middleware:** mount the same required-session middleware (`allowGuestCreation: false`) and the same 16 KB body limit as `/api/decisions`, on `/api/history`.
  - Reuse the existing middleware instances. You may rename them in `app.ts` to neutral names, e.g. `requiredSession` and `jsonBodyLimit`.
- **`limit`:**
  - optional; the default is `maxHistoryEntriesPerUser`
  - it must be an integer from 1 to `maxHistoryEntriesPerUser`
  - anything else → 400 `invalid_query`, message `The query is invalid.`
- **The body:**
  - invalid JSON → 400 `invalid_json`
  - `HistoryEntryCreate.safeParse` fails → 400 `invalid_body`, message `The history entry is invalid.`
  - Do not echo the zod issues.
  - A mismatched result → 400 `invalid_result`, from the service.
- Build the responses as typed values, like the decisions routes. Keep handlers thin.

### E — Tests (PGlite)
Follow the setup of `decisions.service.test.ts` / `decisions.test.ts`: one database per file, users created with `createGuestSession`, and no test depends on another. Build valid results with `select(options, seed)`.

1. **`history.service.test.ts`:**
   - create with a `draft` source:
     - `list` returns it with the right `title`, `winner` (the full option, emoji included) and `source`
     - the stored `options` keep the disabled options with `enabled: false`; read them from the table in the test
   - a mismatched result (another candidate as `winnerId`) → 400 `invalid_result`, and no row is stored
   - a `decision` source:
     - the caller's decision → `decisionId` kept
     - another user's decision id → `decisionId: null`
     - deleting the caller's decision afterwards → the entry is still listed, with `decisionId: null`
   - a `preset` source keeps the slug
   - `list` returns only the caller's entries, newest first, and respects `limit`. Use injected `now` values.
   - **pruning:**
     - with 200 entries already stored (one bulk insert in the setup, not 200 service calls), one more create leaves 200 rows
     - the oldest row is gone
     - another user's entries are untouched
   - deleting the user cascades to their entries
2. **`history.test.ts` (routes):**
   - `GET /api/history` without a cookie → 401 `session_required`, and no new row in `users`
   - `POST`:
     - malformed JSON → 400 `invalid_json`
     - an invalid body → 400 `invalid_body`
     - a mismatched result → 400 `invalid_result`
   - `POST` valid → 201, and `HistoryEntry.parse` accepts the response
   - `GET ?limit=1` → one entry, and `HistoryListResponse.parse` accepts it; `GET ?limit=0` and `?limit=abc` → 400 `invalid_query`
3. No render/snapshot/E2E/curl tests (Testing policy in CLAUDE.md).

## Acceptance criteria
- [ ] No new dependency; the lockfile is unchanged.
- [ ] The migration is generated, additive only, and applied in dev.
- [ ] The server rejects any result that `select` would not produce for the stored options.
- [ ] Another user's decision id is never linked, and is never reported as an error.
- [ ] Deleting a decision keeps its history entries, unlinked. Deleting a user deletes their entries.
- [ ] A user never has more than 200 entries.
- [ ] `/api/history` never creates a guest user.
- [ ] `/api/me` and `/api/decisions*` behave exactly as before, and all existing tests pass unchanged.
- [ ] No `as any`, no `@ts-expect-error`, no non-null `!` assertions added.
- [ ] `make check` passes, including the new tests.

## Validation
Run and include the output in the report:
```bash
make check
make db-migrate
cat apps/api/drizzle/0002_*.sql
git diff --stat feat/phase-6-result-history...HEAD
git diff feat/phase-6-result-history...HEAD -- pnpm-lock.yaml | head -5
```
- The last command must print nothing.
- Restart the api after migrating if needed: `docker compose -f compose.dev.yaml restart api`.

## Git
- Create branch `feat/6-1-history-api` from **`feat/phase-6-result-history`**.
- Use small logical commits, e.g.:
  - `feat(domain): add history schemas and selection match`
  - `feat(api): add decision_sessions table`
  - `feat(api): add history routes with server re-check`
  - `test(api): cover history service and routes`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed): `make check` with test counts, the migration SQL
4. Deviations from this handoff and why (especially the middleware renaming in `app.ts`)
5. Known issues / open questions
6. No visual review for this task (API only).
