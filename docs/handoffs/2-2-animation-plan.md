# HANDOFF 2-2 — Animation-plan math: strip, seeded stop offset and the spin curve

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-005, D-006, D-024, D-025, D-026** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Handoff 2-1 added these to `packages/domain`:
- the decision model (`DecisionOption` with `weight` 1–5 and `enabled`)
- `createRng` (mulberry32)
- `select(options, seed)`, which returns `SelectionResult { algorithm, seed, winnerId, candidateIds }`

The selection consumes exactly the first value of `createRng(seed)`.

This task adds the second half of D-005: `buildAnimationPlan()`. It turns a `SelectionResult` into everything the case carousel (Phase 3) needs:
- the strip of cells
- the winner cell index
- the start and stop positions
- the duration
- a pure function for the position at any elapsed time

Everything is measured in **item units** (1 = one cell width), so a resize mid-spin cannot break the stop (CLAUDE.md rule 10). Pixels and the DOM are Phase 3.

Owner and architect choices this implements:
- **D-006:** one continuous timeline. A short acceleration flows into a long deceleration, with no velocity jump. The visual phases (fast, decelerating, final approach) are derived later from this one curve.
- **D-026:** the stop lands at a seeded offset inside a central band of the winner cell, never near its edges.
- **D-024 honesty:** filler cells are drawn with the same weights as the selection, so what the user sees matches the chances. The only exception is that the two cells next to the winner are never the winner itself, so the stop is never ambiguous.

The values in `ANIMATION_PLAN_DEFAULTS` are first guesses. They are tuned in the browser in Phase 2.5. Keep them in that one object.

The task also folds in three small cleanups from the 2-1 review (N1–N3).

## Scope
- R1: shared weighted pick. This also fixes N1.
- R2: the spin curve.
- R3: `buildAnimationPlan` and `positionAt`.
- R4: exports.
- R5: tests, including N2 and N3.

## Out of scope (do NOT do)
- Any UI, carousel, state machine, `/design` change, CSS or pixel math.
- Reduced-motion behavior (the Phase 3 controller decides it; the plan is the same).
- A zod schema for the plan. The plan is never sent over the network: history stores the seed and the options and recomputes it.
- Changing the `select` algorithm or its results. The golden winners must stay identical.
- Overshoot/settle-back, sound, visual phase names.
- New dependencies. Render, snapshot or E2E tests.

## Files to create / modify
- `packages/domain/src/selection/weighted.ts`: new, `pickWeighted` (R1).
- `packages/domain/src/selection/select.ts`: use `pickWeighted` (R1 / N1).
- `packages/domain/src/selection/select.test.ts`: N2, N3.
- `packages/domain/src/animation-plan/curve.ts`: new (R2).
- `packages/domain/src/animation-plan/plan.ts`: new (R3).
- `packages/domain/src/animation-plan/curve.test.ts`, `plan.test.ts`: new (R5).
- `packages/domain/src/index.ts`: exports (R4).

## Allowed dependencies
None.

## Requirements

### R1. Shared weighted pick
`selection/weighted.ts` (internal, not exported from `index.ts`):
```ts
export function pickWeighted<T extends { readonly weight: number }>(
  items: readonly T[],
  rng: () => number,
): T
```
1. `total` is the sum of the weights.
2. `r = Math.floor(rng() * total)`. This consumes exactly one PRNG value.
3. Walk the items in order and return the first item where `r < weight`. Otherwise subtract its weight and continue.
4. If the loop ends without returning (empty input, or invalid weights), throw an `Error('Weighted pick requires positive integer weights.')`.

`select.ts` keeps its two `RangeError` guards and replaces its walk with `pickWeighted(candidates, createRng(seed))`. This removes the dead `firstCandidate` guard (N1). All existing `select` tests must pass unchanged.

### R2. Spin curve (`animation-plan/curve.ts`)
```ts
export function spinProgress(t: number, accelFraction: number, decelPower: number): number
```
This maps normalized time `t ∈ [0, 1]` to normalized distance `[0, 1]`. Clamp `t` into `[0, 1]` first.

The velocity profile:
- rises linearly from 0 to `vMax` over `[0, a]`, where `a = accelFraction`
- then decays as `vMax · ((1 − t)/(1 − a))^n` over `[a, 1]`, where `n = decelPower`

Integrated, with `vMax = 1 / (a/2 + (1 − a)/(n + 1))`:
- for `t ≤ a`: `vMax · t² / (2a)`
- for `t > a`: `vMax · a/2 + vMax · (1 − a)/(n + 1) · (1 − ((1 − t)/(1 − a))^(n + 1))`

Properties:
- `spinProgress(0) = 0` and `spinProgress(1) = 1` (return exactly `1` for `t ≥ 1`)
- monotonic
- the velocity is continuous at `a` and reaches 0 at `t = 1`, so the stop is smooth with no jerk

### R3. Plan (`animation-plan/plan.ts`)
```ts
export const ANIMATION_PLAN_DEFAULTS = {
  leadingItems: 8,      // cells before the start cell (fill the left of the viewport)
  trailingItems: 8,     // cells after the winner cell (fill the right of the viewport)
  minSpinItems: 40,     // minimum cells travelled from start cell to winner cell
  spinItemsJitter: 8,   // + seeded 0…jitter-1 extra cells
  stopBand: 0.6,        // stop lands within ±stopBand/2 of the winner cell centre
  durationMs: 6000,
  accelFraction: 0.06,
  decelPower: 3,
} as const;

export type AnimationPlanParams = { readonly [K in keyof typeof ANIMATION_PLAN_DEFAULTS]: number };

export type AnimationPlan = {
  strip: string[];        // option ids, one per cell
  winnerIndex: number;
  startPosition: number;  // item units, the strip coordinate under the marker at t = 0
  stopPosition: number;   // item units, the strip coordinate under the marker at the end
  stopOffset: number;     // stopPosition − (winnerIndex + 0.5), in item units
  durationMs: number;
  accelFraction: number;
  decelPower: number;
};

export function buildAnimationPlan(
  result: SelectionResultData,
  options: readonly DecisionOptionData[],
  params: AnimationPlanParams = ANIMATION_PLAN_DEFAULTS,
): AnimationPlan

export function positionAt(plan: AnimationPlan, elapsedMs: number): number
```
The strip coordinate `x` means the marker is over cell `floor(x)`. The cell centre is at `index + 0.5`.

`buildAnimationPlan`:
1. **Consistency.** `candidates` = the enabled options in input order. Throw a `RangeError` in any of these cases:
   - their ids do not equal `result.candidateIds` (same ids, same order)
   - `result.winnerId` is not among them
   - `result.algorithm !== SELECTION_ALGORITHM`
2. **PRNG.** Use `rng = createRng((result.seed ^ 0x9e3779b9) >>> 0)`. This stream is independent of the selection's. Name the salt constant (`PLAN_SEED_SALT`). Draw values in **exactly this order**:
   1. `spinItems = minSpinItems + Math.floor(rng() * spinItemsJitter)`
   2. `stopOffset = (rng() * 2 − 1) * stopBand / 2`
   3. the filler cells, from index `0` up to the last index, skipping the winner cell (no draw for it)
3. **Layout:**
   - `startIndex = leadingItems`, `startPosition = startIndex + 0.5`
   - `winnerIndex = startIndex + spinItems`
   - `strip.length = winnerIndex + 1 + trailingItems`
   - `strip[winnerIndex] = result.winnerId`
   - `stopPosition = winnerIndex + 0.5 + stopOffset`
4. **Filler:** each other cell is `pickWeighted(eligible, rng).id`.
   - `eligible` is all candidates.
   - For cells `winnerIndex − 1` and `winnerIndex + 1`, `eligible` is the candidates without the winner.
   - No other constraints. Adjacent repeats are allowed, so the weights stay honest.
5. Copy `durationMs`, `accelFraction` and `decelPower` from `params` into the plan.
6. The function is pure: it does not mutate its inputs and uses no global randomness or time. The same `(result, options, params)` always gives a deep-equal plan.

`positionAt(plan, elapsedMs)`:
- for `elapsedMs ≤ 0`, return `plan.startPosition`
- for `elapsedMs ≥ plan.durationMs`, return **exactly** `plan.stopPosition`
- otherwise, return `startPosition + (stopPosition − startPosition) · spinProgress(elapsedMs / durationMs, accelFraction, decelPower)`

### R4. Exports (`index.ts`)
- Add:
  - `buildAnimationPlan`
  - `positionAt`
  - `spinProgress`
  - `ANIMATION_PLAN_DEFAULTS`
  - the types `AnimationPlan` and `AnimationPlanParams`
- Do not export `pickWeighted` or the salt constant.

### R5. Tests (vitest, deterministic only)
**`select.test.ts`:**
- N2: add seed `42 → b` to the golden table.
- N3: replace the six repeated distribution `expect` lines with a loop over `[[id, 0.2], [id, 0.6], [id, 0.2]]`, in the same shape as the equal-weights test.
- Every existing case still passes with the same values.

**`curve.test.ts`** (use `a = 0.06`, `n = 3`, the defaults):
- `spinProgress(0) === 0`, `spinProgress(1) === 1`. Inputs below 0 and above 1 are clamped.
- It is monotonic non-decreasing over 1 001 evenly spaced samples.
- Velocity continuity at `a`: the numeric derivatives at `a − 1e-6` and `a + 1e-6` differ by less than 1 %.
- Smooth stop: `1 − spinProgress(0.999) < 1e-9`.
- Most of the distance is covered early: `spinProgress(0.5) > 0.85`.

**`plan.test.ts`**, using the fixtures from `select.test.ts` (weights `[1, 3, 1]`; a fourth disabled option with weight 5 where relevant). Unless stated otherwise, check every property across seeds 0…499 with `result = select(options, seed)`:
- The plan is deterministic (deep-equal twice) and does not mutate its inputs.
- `strip[winnerIndex] === winnerId`.
- `winnerIndex − leadingItems` is in `[minSpinItems, minSpinItems + spinItemsJitter)`.
- `strip.length === winnerIndex + 1 + trailingItems`.
- `startPosition === leadingItems + 0.5`.
- `stopPosition === winnerIndex + 0.5 + stopOffset`, and `|stopOffset| ≤ stopBand / 2`.
- `floor(stopPosition) === winnerIndex`, so the marker really ends on the winner cell.
- Every strip id is a candidate, and a disabled option never appears.
- `strip[winnerIndex − 1]` and `strip[winnerIndex + 1]` are never the winner. Check this also with exactly 2 enabled options.
- Honest filler: aggregate the filler cells over seeds 0…1 999, excluding the winner cell and its two neighbours. The share of each option is within ±3 pp of its weight share (20 % / 60 % / 20 %).
- `positionAt`:
  - at `−1` it returns `startPosition`
  - at `durationMs` and at `durationMs + 1` it returns exactly `stopPosition` (`toBe`)
  - it is non-decreasing over 200 samples
- `RangeError` in each of these cases:
  - `winnerId` is not a candidate
  - `candidateIds` are in a different order from the enabled options
  - an extra id is present
  - `algorithm` is `'other'`
- A regression pin, for seed `42` with the `[1, 3, 1]` options: record `winnerIndex`, `stopOffset` (`toBe`) and `strip.slice(0, 12)`. Take the values from your implementation only **after** every property test above passes, and report them.
- Custom params are honoured: for example, `minSpinItems: 10`, `spinItemsJitter: 1` gives `winnerIndex === leadingItems + 10`.

## Acceptance criteria
- [ ] `select` golden winners are unchanged, and seed 42 is added. `pickWeighted` is the only weighted walk in the domain.
- [ ] All R5 tests exist and pass. `make check` passes.
- [ ] The domain greps stay clean: no `Math.random`, `crypto`, `Date.now` or `new Date` in `packages/domain/src`. No `'zod'` classic import.
- [ ] No magic numbers outside `ANIMATION_PLAN_DEFAULTS`, `DECISION_LIMITS`, the PRNG constants and the named salt.
- [ ] No change outside `packages/domain`. No lockfile change. No new dependency.

## Validation
Run these and include the trimmed output in the report:
```bash
make check
git grep -nE "Math\.random|crypto|Date\.now|new Date|from 'zod'" -- packages/domain/src
git diff --stat feat/phase-2-core-domain
git diff --stat feat/phase-2-core-domain -- pnpm-lock.yaml
```

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md). Data assertions on plan values are fine.

## Git
- Create branch `feat/2-2-animation-plan` from **`feat/phase-2-core-domain`**, not from `main`.
- Make exactly **one** commit: `feat(domain): animation plan with seeded stop offset and spin curve`.
- Do not commit to `main` or `feat/phase-2-core-domain`. Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including:
   - the test count per file
   - the seed-42 regression pin values
4. Deviations from this handoff and why
5. Known issues / open questions. For example, whether the default values look plausible on paper: the peak speed in cells/s, or cells passed in the last second.
6. Browser check: none. This task is domain-only. The feel is reviewed in Phase 2.5.
