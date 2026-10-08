# HANDOFF 2-5 — Case-opening spike in `/design` (tuning playground for the animation plan)

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-005, D-006, D-010, D-022, D-024, D-026** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 2 is merged. `packages/domain` exports:
- `select(options, seed)`, which returns a `SelectionResult`
- `buildAnimationPlan(result, options, params?)`, which returns an `AnimationPlan` with `strip`, `winnerIndex`, `startPosition`, `stopPosition`, `stopOffset`, `durationMs`, `accelFraction` and `decelPower`
- `positionAt(plan, elapsedMs)`
- `ANIMATION_PLAN_DEFAULTS` and the type `AnimationPlanParams`

All positions are in **item units**. Coordinate `x` means the central marker is over cell `floor(x)`, and a cell centre is at `index + 0.5`.

The defaults are first guesses on paper. The architect expects the tail to be too long: about 0.6 cells move in the last 2 s. The owner must **feel** the spin in a real browser before Phase 3 builds the real case-opening feature.

This task builds a **throwaway, dev-only tuning playground** inside `/design`. It has:
- a rough horizontal strip with a centre marker
- a Play button
- live controls for every plan parameter
- a readout of the values to send back to the architect

It is **not** the Phase 3 component:
- no state machine, reveal, confetti, sound or i18n
- no reuse outside `/design`

Phase 3 builds `features/case-opening/` from scratch and deletes this section. `/design` is never shipped in prod (D-022).

It also folds in one small domain cleanup from the 2-2 review (R0).

## Scope
- R0: `pickWeighted` validates before it draws.
- R1: a new `/design` section "Case spike".
- R2: the strip, marker and rAF loop driven by `positionAt`.
- R3: the tuning controls and the readout.

## Out of scope (do NOT do)
- `apps/web/src/features/**`, routing, Home, or any change to `App.tsx` or `main.tsx`.
- Any change to the domain math or to `ANIMATION_PLAN_DEFAULTS` values. The architect changes the defaults after the owner tunes them.
- State machine, winner reveal screen, confetti, blur, sound, haptics, reduced-motion handling (all Phase 3).
- New shared UI primitives, or changes to existing primitives, `tokens.css` or `global.css`.
- Animation libraries or any new dependency. Render, snapshot or E2E tests.

## Files to create / modify
- `packages/domain/src/selection/weighted.ts`: R0.
- `apps/web/src/pages/design/CaseSpikeSection.tsx`: new (R1–R3).
- `apps/web/src/pages/design/CaseSpikeSection.module.css`: new.
- `apps/web/src/pages/design/DesignPage.tsx`: add the nav link `#case-spike` and render `<CaseSpikeSection />` after `<ComponentsSection />`. Nothing else changes there.

## Allowed dependencies
None.

## Requirements

### R0. `pickWeighted` validation order
In `packages/domain/src/selection/weighted.ts`:
1. Throw `Error('Weighted pick requires at least one item.')` when `items` is empty.
2. Then throw `Error('Weighted pick requires positive integer weights.')` when any weight is not a positive integer.
3. Only then draw the single PRNG value and walk the items.

The final unreachable `throw` stays as an invariant guard.

Existing tests must pass unchanged: the `select` golden winners and the 2-2 seed-42 pin. Add 2 small tests to `select.test.ts` or a new `weighted.test.ts`:
- the empty list throws
- an invalid weight throws **without** consuming the RNG (use a counting rng stub)

### R1. Section
`CaseSpikeSection` reuses the `/design` section chrome exactly like `ComponentsSection` does:
- `pageStyles.section`, `pageStyles.sectionHeading`, `pageStyles.sectionIndex`
- index `07`, title "Case spike", `id="case-spike"`
- one line of description: "Throwaway tuning playground for the animation plan. Not the Phase 3 component."

English literals are fine here (dev-only page, D-022).

Use the existing primitives (`Button`, `Chip`, `TextField`, `Card`, `Badge`) for every control. Do not add new primitives. Styling follows the design system:
- tokens only
- no raw color, duration or shadow literals
- no `px` literals

### R2. Strip, marker and loop
**Demo pool.** Hard-code 20 demo options in the section file:
- valid UUIDs; Vietnamese food/activity labels with diacritics and one native emoji each
- weights cycling through 1–5, all enabled

A pool-size chip group (`2 / 5 / 8 / 20`) uses the first N options. Mutually exclusive chips are fine on this dev page.

An "Equal weights" `Switch` sets every weight to 1.

**Seed.**
- By default each Play uses a fresh seed from `crypto.getRandomValues(new Uint32Array(1))[0]`.
- A "Replay" button reuses the last seed.
- A numeric seed field lets the owner type a seed and play it.
- Always show the seed used.

**Plan.** On Play, call:
```
select(pool, seed) → buildAnimationPlan(result, pool, params)
```
The UI never picks the winner.

**Layout:**
- A viewport with `overflow: hidden`.
- A horizontal strip of cells, `flex` with no gap.
- Cell width is a token-based size, e.g. `calc(var(--space-8) * 2)`, so the **pitch equals the cell width**.
- A cell shows the emoji above the label, with an ellipsis for long labels.
- Separate cells visually with token borders, not gaps.
- A fixed centre marker line is absolutely positioned at 50 % of the viewport, in the coral token. It is drawn above the strip by DOM order, with no z-index literal.
- Render the whole `plan.strip` (≈ 60 cells). No virtualization.

**Transform.** Each frame, set the strip's style directly through a ref, never through React state:
```
transform = translate3d(viewportWidth / 2 − position × cellWidth, 0, 0)
```
- `position = positionAt(plan, elapsed)`.
- Measure `cellWidth` and `viewportWidth` with `getBoundingClientRect`:
  - at Play
  - again on resize, through a `ResizeObserver` on the viewport
- Positions stay in item units, so a resize mid-spin must still stop on the winner (rule 10).
- Animate `transform` only. Set the transform through CSSOM, as CSP allows.

**Loop:**
- `requestAnimationFrame` with `performance.now()`.
- A speed chip group (`×1 / ×0.25`) scales the elapsed time, for slow-motion inspection of the stop.
- The loop stops when `elapsed ≥ plan.durationMs`. It cancels the frame on unmount and when Play is pressed again.
- **Before the first Play** (idle): the strip shows a plan for a fixed seed, positioned at `startPosition`.

**Finish.**
- Outline the winner cell with a token color/border.
- Show the "Winner: emoji label" text and the final `stopOffset`.
- No other reveal.

**Live readout** (updated through refs each frame, not React state):
- elapsed / duration
- position
- current speed in cells/s, from the position delta divided by the frame delta

### R3. Tuning controls and readout
- One numeric `TextField` per key of `ANIMATION_PLAN_DEFAULTS`:
  - `durationMs`, `minSpinItems`, `spinItemsJitter`, `stopBand`, `accelFraction`, `decelPower`, `leadingItems`, `trailingItems`
  - each with a sensible `min`/`max`/`step`, and with `stopBand` < 1 and `accelFraction` < 1
  - The controls are disabled while spinning.
  - An invalid or empty value falls back to the default and shows the field error "Invalid — using default".
- A "Reset to defaults" button.
- A read-only block showing the current params as JSON (`<pre><code>`), plus a "Copy params" button using `navigator.clipboard.writeText`. The owner pastes these values to the architect.
- A computed hint line under the controls, recomputed from the current params, using an `accelFraction`/`decelPower`/duration-based estimate through `positionAt` on a sample plan:
  - peak speed in cells/s
  - cells moved in the last 1 s
  - cells moved in the last 2 s

## Acceptance criteria
- [ ] R0 is done. Every existing domain test passes unchanged, and the 2 new tests pass.
- [ ] `/design#case-spike` exists and is linked from the contents nav. Its chrome matches the other sections.
- [ ] Play spins a strip under a centre marker and always stops on the winner cell, inside its central band. Replay with the same seed gives an identical spin. Resizing the window mid-spin still stops on the winner.
- [ ] Changing any param changes the next spin. The JSON readout and Copy work.
- [ ] No React state update per frame (refs only). No console errors or warnings. No leaked rAF after leaving the section via HMR or unmount.
- [ ] The raw-literal greps are clean (below).
- [ ] The prod build has no `/design` or spike leak. Main JS gzip stays at about 76.98 kB (±0.3 kB).
- [ ] `make check` passes.

## Validation
Run these and include the trimmed output in the report:
```bash
make check

grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|cubic-bezier\(|[0-9.]+m?s\b" apps/web/src --include='*.css' --include='*.tsx' --include='*.ts' | grep -v 'apps/web/src/styles/tokens.css'
grep -rnE "[0-9]px" apps/web/src --include='*.css' --include='*.tsx' | grep -v 'apps/web/src/styles/tokens.css'

docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c \
  'pnpm --filter @piko/web build && \
   (grep -rl "DesignPage\|ẤẦẨẪẬ\|Xoay kèo ngay\|Case spike" apps/web/dist && echo "LEAK" || echo "no /design in prod build")'
```
- The first grep must print nothing.
- The `px` grep may print only the existing `DesignPage.tsx` "A 4px base…" prose line.
- Afterwards delete `apps/web/dist`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/2-5-case-spike` from **`feat/phase-2-5-case-spike`**, the integration branch. Do not branch from `main`.
- Make exactly **one** commit: `feat(web): case-opening tuning spike in /design`.
- Do not commit to `main` or to the integration branch. Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including the main JS gzip size
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check at `localhost:5173/design#case-spike`:
   - Play several times at pool sizes 2, 5, 8 and 20. Does the start feel fast enough? Is the tail too long or too short? Does the stop land convincingly off-centre?
   - Try ×0.25 to watch the final approach and the stop.
   - Resize the window mid-spin.
   - Tune the params until it feels right, then press "Copy params" and paste the JSON to the architect.
