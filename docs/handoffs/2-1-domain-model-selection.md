# HANDOFF 2-1 — Domain model, zod/mini schemas and the seeded selection engine

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-005, D-017, D-020, D-024, D-025** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 1 is complete. `packages/domain` holds only 3 API schemas (`api/error.ts`, `api/health.ts`, `api/me.ts`), written with zod classic.

Phase 2 builds the core decision domain. This task is the first slice:
1. Convert the domain schemas to `zod/mini` (D-020).
2. Add the decision model and its validation (D-024).
3. Add the seeded PRNG and the weighted selection engine (D-025).

The animation-plan math comes in the next handoff (2-2). No UI, API route or DB table is touched here.

Architecture rules that matter here (CLAUDE.md):
- **Rule 1:** the winner is decided before any animation, by `select()`.
- **Rule 2:** there is one seedable engine in `packages/domain/src/selection/`. The same seed and options always give the same result.
- **Rule 3:** `packages/domain` is framework-free. No React, DOM, Hono, Drizzle or Node APIs, and no global random source (`Math.random`, `crypto`).
- **Rule 8:** the domain is not tied to restaurants. Category is data.

## Scope
- R1: guard the domain's TypeScript environment.
- R2: convert the 3 existing schemas to `zod/mini`, and adapt their 1 web consumer.
- R3: decision limits and schemas.
- R4: the PRNG.
- R5: the selection engine and the `SelectionResult` schema.
- R6: public exports.
- R7: tests.

## Out of scope (do NOT do)
- Animation plan, carousel, state machine, any UI or `/design` change.
- API routes, services, DB schema or migrations.
- Seed generation (`crypto.getRandomValues` belongs to the web in Phase 3).
- "Not Tonight" exclusion, history, presets/templates.
- Converting `apps/api/src/env.ts`, which stays zod classic per D-020.
- New dependencies or version changes. `vitest` is already a root devDependency.
- Render, snapshot or E2E tests.

## Files to create / modify
- `packages/domain/tsconfig.json`: environment guard (R1).
- `packages/domain/package.json`: add the `test` script only.
- `packages/domain/src/api/error.ts`, `health.ts`, `me.ts`: zod/mini (R2).
- `apps/web/src/lib/api/client.ts`: accept mini schemas (R2).
- `packages/domain/src/decision/limits.ts`: new (R3).
- `packages/domain/src/decision/schemas.ts`: new (R3).
- `packages/domain/src/selection/prng.ts`: new (R4).
- `packages/domain/src/selection/select.ts`: new (R5).
- `packages/domain/src/selection/result.ts`: new (R5).
- `packages/domain/src/index.ts`: exports (R6).
- Tests next to the code: `decision/schemas.test.ts`, `selection/prng.test.ts`, `selection/select.test.ts` (R7).

## Allowed dependencies
None. Use `zod` 4.6.5 (already a domain dependency) through its `zod/mini` entry point, and the root `vitest`.

## Requirements

### R1. Domain TypeScript environment
In `packages/domain/tsconfig.json`, add:
- `"lib": ["ES2022"]`, so DOM globals do not typecheck in the domain
- `"types": []`, so Node globals do not typecheck in the domain

Test files import `describe`/`it`/`expect` explicitly from `vitest`, so they still compile.

Add `"test": "vitest run"` to `packages/domain/package.json`. The root `pnpm test` then picks it up.

### R2. zod/mini conversion
- Every file in `packages/domain/src` imports `* as z from 'zod/mini'`. No file in `packages/domain` imports `'zod'`.
- Use the functional mini API, e.g. `z.optional(x)` and `.check(z.minLength(1))`.
- Keep the 3 existing schemas' shapes and exported names exactly as they are.
- `apps/web/src/lib/api/client.ts`:
  - change the `schema` parameter type so it accepts the mini schemas (e.g. `ZodMiniType<T>` from `'zod/mini'`)
  - keep the behavior identical
  - `apps/web` must not import the classic `'zod'` entry anywhere, including type-only imports
- The api only imports domain **types** today, so nothing else should need changing. If it does, stop and report.

### R3. Decision limits and schemas
`decision/limits.ts`:
```ts
export const DECISION_LIMITS = {
  minOptions: 2,
  maxOptions: 20,
  minEnabledOptions: 2,
  labelMaxLength: 40,
  titleMaxLength: 60,
  categoryMaxLength: 32,
  emojiMaxLength: 16,
  weightMin: 1,
  weightMax: 5,
  weightDefault: 1,
} as const;
```
The schemas and tests use these constants. Do not repeat the numbers anywhere else.

`decision/schemas.ts` (zod/mini):
- **Text normalization** for `label` and `title`:
  - apply NFC normalization, then trim, **before** the length checks (mini overwrite checks such as `z.normalize()` and `z.trim()`)
  - the parsed output is the normalized, trimmed string
  - length is measured in UTF-16 units after normalization (`string.length`)
- `DecisionOption`:
  - `id`: `z.uuid()`
  - `label`: normalized, length 1…`labelMaxLength`
  - `emoji`: optional. If present, 1…`emojiMaxLength` UTF-16 units, matching:
    ```
    /^(?=.*\p{Extended_Pictographic})[\p{Extended_Pictographic}\p{Emoji_Component}‍️]+$/u
    ```
    One native emoji, including ZWJ sequences and skin tones. Flag emoji may fail, which is accepted for now.
  - `weight`: integer, `weightMin`…`weightMax`, **required**. Defaults are the UI's job.
  - `enabled`: boolean, required.
- `Decision`:
  - `id`: `z.uuid()`
  - `title`: normalized, length 1…`titleMaxLength`
  - `category`: optional, matches `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, max `categoryMaxLength`
  - `options`: an array of `DecisionOption`, length `minOptions`…`maxOptions`
  - Cross-field checks, as refinements on the `Decision` object. Each failure must produce a distinct, stable issue so the UI can map it to i18n later. Use a custom issue message equal to the code string:
    - `duplicate_option_id`: option ids are unique.
    - `duplicate_option_label`: labels are unique, compared after normalization with `toLocaleLowerCase('vi')`.
    - `not_enough_enabled_options`: at least `minEnabledOptions` options have `enabled: true`.
- Exported names follow the existing convention: the schema is the value export, and the type is `z.infer`, exported as `…Data` from `index.ts`.

### R4. PRNG (`selection/prng.ts`)
- `export function createRng(seed: number): () => number` implements **mulberry32** exactly as below. It returns floats in `[0, 1)`.
  ```ts
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  ```
- It is pure: no module-level state, and every call to `createRng` gives an independent stream.
- `selection/result.ts` exports `Seed`, a zod/mini integer schema for `0 … 0xFFFFFFFF` (unsigned 32-bit).

### R5. Selection engine
`selection/result.ts`:
```ts
SelectionResult = {
  algorithm: 'weighted-v1',   // z.literal
  seed: Seed,
  winnerId: uuid,
  candidateIds: uuid[],       // min 2 — the enabled option ids, in input order
}
```
Export `SELECTION_ALGORITHM = 'weighted-v1' as const` and use it in the schema and in `select()`.

`selection/select.ts`:
```ts
export function select(options: readonly DecisionOptionData[], seed: number): SelectionResultData
```
1. `candidates` = the options with `enabled: true`, in input order.
2. Throw a `RangeError` in either case:
   - fewer than `minEnabledOptions` candidates
   - `seed` is not an integer in `0…0xFFFFFFFF`

   Callers are expected to validate with `Decision` first. This is a defensive guard and does not re-validate the whole schema.
3. `total` = the sum of the candidate weights. `r = Math.floor(createRng(seed)() * total)`. This uses exactly the **first** PRNG value.
4. Walk the candidates in order. The winner is the first one where `r < weight`; otherwise subtract its weight and continue.
5. Return `{ algorithm: SELECTION_ALGORITHM, seed, winnerId, candidateIds }`.

It must not mutate its input or use any global random source or time.

### R6. Exports (`index.ts`)
- Export the new schemas, `DECISION_LIMITS`, `SELECTION_ALGORITHM`, `createRng` and `select`.
- Export types: `DecisionData`, `DecisionOptionData`, `SelectionResultData`, `SeedData`.
- Keep the existing exports unchanged.
- No barrel files inside subfolders.

### R7. Tests (vitest, deterministic only)
`selection/prng.test.ts`:
- Golden values: the first three outputs must equal these **exactly** (`toBe`):

| seed | outputs |
|---|---|
| `0` | `0.26642920868471265, 0.0003297457005828619, 0.2232720274478197` |
| `1` | `0.6270739405881613, 0.002735721180215478, 0.5274470399599522` |
| `42` | `0.6011037519201636, 0.44829055899754167, 0.8524657934904099` |
| `4294967295` | `0.8964226141106337, 0.189478256739676, 0.7156526781618595` |

- Two `createRng(7)` streams are independent and identical.
- 10 000 outputs from one seed are all in `[0, 1)`.

`selection/select.test.ts`, using 3 enabled options `a`, `b`, `c` (fixed UUIDs) with weights `[1, 3, 1]`:
- Golden winners:
  - seeds `0, 1, 2, 3, 5, 6, 42` → `b`
  - seed `4` → `c`
  - seed `7` → `a`
- The same seed gives an identical result twice. The input array is not mutated.
- `candidateIds` excludes disabled options. A disabled option is never the winner across seeds 0…999, even with weight 5.
- Distribution: over seeds 0…9 999, the win counts of `a`/`b`/`c` are each within ±3 percentage points of 20 % / 60 % / 20 %. This is deterministic, not flaky.
- Equal weights: over seeds 0…9 999, each of 4 options wins 25 % ± 3 pp.
- `RangeError` for 1 enabled option, for seed `-1`, for `2 ** 32`, and for `1.5`.
- `SelectionResult.safeParse(select(...)).success` is `true`.

`decision/schemas.test.ts`:
- A valid decision parses. The label `"  Phở  "` comes out as `"Phở"`. A decomposed (NFD) Vietnamese label comes out NFC.
- Rejects:
  - 1 option, and 21 options
  - empty or whitespace-only label
  - a 41-character label (while a 40-character label passes)
  - weight `0`, `6` and `2.5`
  - a 61-character title
  - category `"Food"` and `"food-"`
- Emoji: `"🍜"`, `"👍🏽"` and `"👨‍👩‍👧"` pass; `"a"`, `"12"` and `"🍜 x"` fail; and an absent emoji passes.
- Cross-field: each case fails with its exact code in the issue messages:
  - duplicate ids → `duplicate_option_id`
  - labels `"Phở"` and `"phở"` → `duplicate_option_label`
  - only one enabled option → `not_enough_enabled_options`

## Acceptance criteria
- [ ] `git grep -nE "from 'zod'" -- packages apps/web` prints nothing. `apps/api/src/env.ts` is the only classic import left.
- [ ] `git grep -nE "Math\.random|crypto|Date\.now|new Date" -- packages/domain/src` prints nothing.
- [ ] The domain typechecks with `lib: ["ES2022"]` and `types: []`.
- [ ] All tests in R7 exist and pass. `make check` passes, including `format:check`.
- [ ] `localhost:5173` still shows health ok and a guest id. The `/api/me` parse still works through the mini schema.
- [ ] The prod web build has no `/design` leak. Report the main JS gzip size, which should drop well below 91.72 kB because classic zod leaves the web bundle.
- [ ] No lockfile change. No new dependency.

## Validation
Run these and include the trimmed output in the report:
```bash
make check
git grep -nE "from 'zod'" -- packages apps
git grep -nE "Math\.random|crypto|Date\.now|new Date" -- packages/domain/src
git diff --stat main -- pnpm-lock.yaml
docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c \
  'pnpm --filter @piko/web build && \
   (grep -rl "DesignPage\|ẤẦẨẪẬ\|Xoay kèo ngay" apps/web/dist && echo "LEAK" || echo "no /design in prod build")'
```
Afterwards delete `apps/web/dist`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/2-1-domain-model-selection` from `main`.
- Make exactly **one** commit: `feat(domain): decision model, zod/mini schemas and seeded selection engine`.
- Do not commit to `main`, merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including:
   - the test count per file
   - the main JS gzip size before and after
4. Deviations from this handoff and why. In particular, report any zod/mini API that differs from the names used here.
5. Known issues / open questions
6. What the owner should check in the browser: `localhost:5173` still shows health ok and the guest id
