# HANDOFF 3-1 — Case-opening core: state machine, carousel, reveal trigger, mounted on the main screen

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-005, D-006, D-010, D-019, D-022, D-024, D-026, D-027** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

`packages/domain` is complete for the solo flow:
- `select(options, seed)`
- `buildAnimationPlan(result, options, params?)` returns `strip`, `winnerIndex`, `startPosition`, `stopPosition`, `stopOffset`, `durationMs`, `accelFraction` and `decelPower`, all in item units
- `positionAt(plan, elapsedMs)`
- `ANIMATION_PLAN_DEFAULTS`, with `durationMs` 8000, tuned by the owner

Phase 2.5 built a throwaway tuning spike in `/design#case-spike` (`apps/web/src/pages/design/CaseSpikeSection.*`). It proved the approach:
- a rAF loop writes `translate3d` through a ref
- the cell width and viewport width are measured, and re-measured with a `ResizeObserver`
- the position stays in item units

This task builds the **real** case-opening core under `apps/web/src/features/case-opening/` and **deletes the spike**. Do not copy the spike wholesale; write clean, small components.

Owner decisions (D-027):
- The reveal starts when the strip is visually still: the remaining distance is below 0.02 cell. The loop keeps running to `durationMs`, so the strip lands exactly on the stop without a snap.
- The case-opening screen with a fixed demo pool **replaces the dev health/guest debug screen** in `App.tsx`.
- Sound and haptics are deferred to Phase 8.
- The celebration (pop, dim, confetti, winner panel) is **3-2, not this task**. Here the reveal is minimal: winner emphasis plus a winner line and a "spin again" action.

## Scope
- R1: domain: `revealAtMs` in the plan, plus the 2-2/2.5 cleanup (unexport internals).
- R2: the case-opening state machine.
- R3: the carousel components.
- R4: the controller hook (the rAF loop, resize, reduced motion).
- R5: the main screen in `App.tsx` and the demo pool.
- R6: remove the spike and the dead debug-screen code/strings.

## Out of scope (do NOT do)
- Confetti, winner panel, pop/dim choreography, blur, particles (3-2).
- Sound, haptics (Phase 8).
- Mode selector, presets, routing, Home layout (Phase 4); builder or API calls for decisions (Phase 5); history, "Not Tonight", "Let's Go", share (Phase 6).
- Changing any existing `ANIMATION_PLAN_DEFAULTS` value, the selection or the plan math (apart from adding `revealAtMs`).
- Deleting `apps/web/src/lib/api/**`, or the `ApiError`/`HealthResponse`/`MeResponse` schemas. They stay for later phases.
- New dependencies, animation libraries, new shared UI primitives. Render, snapshot or E2E tests.

## Files to create / modify / delete
- `packages/domain/src/animation-plan/plan.ts`, `plan.test.ts`: R1.
- `packages/domain/src/index.ts`: R1. Unexport `createRng` and `spinProgress`.
- `apps/web/src/features/case-opening/caseOpeningState.ts`: new (R2).
- `apps/web/src/features/case-opening/CaseCarousel.tsx` + `CaseCarousel.module.css`: new (R3).
- `apps/web/src/features/case-opening/CaseItem.tsx` + `CaseItem.module.css`: new (R3).
- `apps/web/src/features/case-opening/useCaseOpening.ts`: new (R4).
- `apps/web/src/features/case-opening/CaseOpening.tsx` + `CaseOpening.module.css`: new. This is the feature screen (R5).
- `apps/web/src/features/case-opening/demoPool.ts`: new (R5).
- `apps/web/src/App.tsx`: R5. Add `App.module.css` only if needed.
- `apps/web/src/i18n/vi.ts`: R5/R6.
- Delete `apps/web/src/pages/design/CaseSpikeSection.tsx` + `.module.css`, and remove its import and nav link from `DesignPage.tsx` (R6).

`CaseMarker` is a single `<span>` inside `CaseCarousel`. Do not make it a separate component.

## Allowed dependencies
None.

## Requirements

### R1. Domain
- Add `revealThresholdItems: 0.02` to `ANIMATION_PLAN_DEFAULTS`.
- Add `revealAtMs: number` to `AnimationPlan`. `buildAnimationPlan` computes it as the **smallest** elapsed time where `stopPosition − positionAt(plan, t) < revealThresholdItems`.
  - Use bisection on `[0, durationMs]`, which is valid because the position is monotonic. Iterate 40 times, then round **up** to an integer number of ms.
  - Clamp the result to `[0, durationMs]`.
  - This adds no PRNG draw, so every existing plan value, including the seed-42 pin, stays identical.
- Tests in `plan.test.ts`:
  - For seeds 0…199:
    - `0 < revealAtMs ≤ durationMs`
    - `stopPosition − positionAt(plan, revealAtMs) < revealThresholdItems`
    - `stopPosition − positionAt(plan, revealAtMs − 1) ≥ revealThresholdItems`
  - With the defaults, `revealAtMs` for seed 42 lies between 6 000 and 7 500. Report the exact value.
- `index.ts`: stop exporting `createRng` and `spinProgress`. Their tests import the modules directly and keep working.

### R2. State machine (`caseOpeningState.ts`)
This is pure TS with no React (CLAUDE.md rule 7). It covers the interaction state only; visual phases are derived from the timeline and are not states.
```ts
type CaseOpeningState =
  | { status: 'ready' }                                   // pool valid, nothing opened yet
  | { status: 'spinning'; plan: AnimationPlan; result: SelectionResultData }
  | { status: 'revealed'; plan: AnimationPlan; result: SelectionResultData };

type CaseOpeningEvent =
  | { type: 'open'; plan: AnimationPlan; result: SelectionResultData }
  | { type: 'reveal' }
  | { type: 'reset' };

export function caseOpeningReducer(state, event): CaseOpeningState
```
- `open` is accepted from `ready` and from `revealed`. It is ignored while `spinning`.
- `reveal` is accepted only from `spinning`.
- `reset` goes back to `ready`.
- An `idle` state (no valid pool) is not needed yet, because the demo pool is always valid. Add it in Phase 5 with the builder.

The reducer stays trivial, so it has no tests (testing policy).

### R3. Carousel components
**`CaseItem`:**
- Props: `option: DecisionOptionData`, `isWinner: boolean`, `revealed: boolean`.
- It shows a large emoji above the label: a single line with an ellipsis, and `title` holding the full label.
- It is a fixed-size card: square-ish, token radius/border/surface, chunky token shadow.
- A neutral emphasis applies when `revealed && isWinner`: token outline/border in the primary color and a lift via `transform`. The real pop animation is 3-2.
- No ARIA on generic elements. Emoji are `aria-hidden`.

**`CaseCarousel`:**
- Props: `plan`, the options lookup, `revealed`, and the ref callbacks it needs from the hook.
- It renders:
  - the viewport, with `overflow: hidden`
  - the strip, a flex row with no gap, so the pitch equals the cell width
  - all `plan.strip` cells
  - a centre marker: a coral token line spanning the viewport, with a small token-sized notch or triangle at the top and bottom, drawn with borders and no images
- Edge fade on both sides: pseudo-element gradients built from the background color token (`transparent` is allowed). This hides cells entering and leaving.
- Cell size is token-based, e.g. `calc(var(--space-8) * 2)` on phones and a larger token multiple from `48rem` up. Use the same `48rem` breakpoint literal as the existing `/design` CSS.
- The viewport is `aria-hidden="true"`. The decorative strip is not announced. The result is announced by R5.

Use only `transform`/`opacity` for motion (rule 10).

### R4. Controller hook (`useCaseOpening.ts`)
`useCaseOpening(options: readonly DecisionOptionData[])` owns:
- the reducer
- `viewportRef` and `stripRef`
- the rAF loop
- the `ResizeObserver`
- reduced-motion detection

It returns `{ state, open, viewportRef, stripRef }`.

**`open()`:**
- the seed comes from `crypto.getRandomValues(new Uint32Array(1))[0]`
- then `select(options, seed)` → `buildAnimationPlan(result, options)` → dispatch `open`
- **The UI never picks the winner** (rule 1).

**Normal motion:**
- One rAF loop over `performance.now()`. Each frame:
  - `position = positionAt(plan, elapsed)`
  - write `translate3d(viewportWidth / 2 − position × cellWidth, 0, 0)` through the strip ref
  - never React state per frame
- When `elapsed ≥ plan.revealAtMs` for the first time, dispatch `reveal` (once).
- Keep looping until `elapsed ≥ durationMs`. Then write the final `stopPosition` and stop.
- Cancel the frame on unmount and on a new `open`.

**Layout:**
- Measure `cellWidth` (first cell) and `viewportWidth` with `getBoundingClientRect` after the plan's strip is committed, i.e. in a layout effect keyed on the plan.
- Re-measure on viewport resize and re-apply the current position. A resize mid-spin must still land on the winner.
- In `ready`, show a plan built once with a fixed seed constant, positioned at `startPosition`, so the screen is not empty. Name the constant. This preview plan is only for display; `open()` always uses a fresh seed.

**Reduced motion** (`matchMedia('(prefers-reduced-motion: reduce)')`, read at `open` time):
- No rAF spin.
- Position the strip at `stopPosition − 3`, without a transition.
- On the next frame, add a class whose CSS is `transition: transform var(--duration-slow) var(--ease-out)`, and set the transform for `stopPosition`.
- On `transitionend`, or as a fallback after reading the computed `transition-duration`, dispatch `reveal`. Then remove the transition class.
- No duration literal in TS or CSS: the duration comes from the token.

### R5. Main screen
**`demoPool.ts`:** export `DEMO_POOL: readonly DecisionOptionData[]`.
- 8 options, e.g. Vietnamese dishes or activities, each with one native emoji.
- Fixed valid UUIDs.
- Mixed weights 1–5, all enabled.
- Every option must be valid under the domain `DecisionOption` schema. Check this by hand. Do not add a runtime `safeParse` check for static data.
- The labels are demo data, not UI copy, so they stay out of i18n.

**`CaseOpening.tsx`** is the screen:
- PIKO wordmark (`t('title')`) and tagline (`t('tagline')`)
- `CaseCarousel`
- the primary action
- a result line

Actions:
- `ready`: primary `Button size="lg"` with `t('openCase')`.
- `spinning`: the button is disabled and shows `t('opening')`.
- `revealed`: the result line shows `t('winnerIs')` + emoji + label, and the button shows `t('spinAgain')`, which calls `open()` again with a new seed and the same pool.

Accessibility:
- The result line is in a `role="status"` / `aria-live="polite"` region. It is empty until the reveal.
- Focus stays on the button.

Layout: centered column, token spacing, cream page background via tokens, good on 360 px phones and on desktop.

**`App.tsx`:**
- Replace the health/guest debug UI with `<CaseOpening options={DEMO_POOL} />`.
- Keep the background session warm-up `useEffect(() => { void ensureSession().catch(() => {}); }, [])`. It must never block or alter the UI (rule 5).
- Remove the health fetch from the web.

**i18n:** add `openCase: 'Mở case'`, `opening: 'Đang mở…'`, `winnerIs: 'Kết quả:'` and `spinAgain: 'Quay lại'`.

### R6. Cleanup
- Delete the spike files, and remove the `CaseSpikeSection` import and the `#case-spike` nav link from `DesignPage.tsx`.
- Remove the i18n keys that become unused after the debug screen goes away: `loading`, `error`, `health`, `database`, `version`, `guest`, `registered`, `currentGuest`, `userKind`, `ok`, `degraded`, `down`, `retry`. Verify each with `git grep` before removing it. Keep `title` and `tagline`.
- No leftover imports, exports or CSS classes.

## Acceptance criteria
- [ ] `localhost:5173` shows PIKO + tagline, the strip with a centre marker, and "Mở case".
- [ ] Pressing "Mở case":
  - spins for about 8 s
  - the result line and winner emphasis appear at `revealAtMs` (about 6.9 s), while the strip is visually still
  - the strip ends exactly under the marker inside the winner cell, with no visible snap
- [ ] "Quay lại" spins again with a new seed. The button is disabled while spinning.
- [ ] Resizing mid-spin still lands on the winner. The layout works at 360 px and at desktop width.
- [ ] Reduced motion (DevTools → Rendering → emulate `prefers-reduced-motion: reduce`) gives a short slide and then the reveal.
- [ ] No per-frame React state. No rAF leak after unmount or HMR. No console errors.
- [ ] `/design` has no case-spike section or link. No `CaseSpikeSection` remains in the repo.
- [ ] `createRng`/`spinProgress` are no longer exported from `@piko/domain`. The domain tests pass, including the new `revealAtMs` tests.
- [ ] Literal greps clean. `make check` passes. The prod build has no `/design` leak. Report the main JS gzip size; a small increase from 76.98 kB is expected.

## Validation
Run these and include the trimmed output in the report:
```bash
make check

grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|cubic-bezier\(|[0-9.]+m?s\b" apps/web/src --include='*.css' --include='*.tsx' --include='*.ts' | grep -v 'apps/web/src/styles/tokens.css'
grep -rnE "[0-9]px" apps/web/src --include='*.css' --include='*.tsx' | grep -v 'apps/web/src/styles/tokens.css'
git grep -nE "CaseSpike|case-spike|healthz|createRng|spinProgress" -- apps
git grep -nE "export .*\b(createRng|spinProgress)\b" -- packages/domain/src/index.ts

docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c \
  'pnpm --filter @piko/web build && \
   (grep -rl "DesignPage\|ẤẦẨẪẬ\|Xoay kèo ngay" apps/web/dist && echo "LEAK" || echo "no /design in prod build")'
```
- The first literal grep must print nothing.
- The `px` grep may print only the `DesignPage.tsx` "A 4px base…" prose line.
- The two `git grep` lines must print nothing.
- Afterwards delete `apps/web/dist`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/3-1-case-carousel` from **`feat/phase-3-case-opening`**, the integration branch.
- Make exactly **one** commit: `feat(web): case-opening core with state machine, carousel and reveal timing`.
- Do not commit to `main` or to the integration branch. Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed / deleted (list)
3. Validation command output (trimmed), including:
   - the test counts
   - the seed-42 `revealAtMs`
   - the main JS gzip size
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check at `localhost:5173`:
   - phone width (DevTools 360 px) and desktop
   - several spins: the speed feel, near misses, the reveal timing against the strip stopping, and the stop precision
   - a resize mid-spin
   - reduced-motion emulation
