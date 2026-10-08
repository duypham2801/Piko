# HANDOFF 3-2 — Reveal celebration: winner pop + dim, in-house confetti, winner panel

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-006, D-010, D-026, D-027** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 3-1 is merged into the integration branch `feat/phase-3-case-opening`. The owner checked it in the browser and approved it. It provides, in `apps/web/src/features/case-opening/`:
- `caseOpeningReducer`: `ready → spinning → revealed`. `reveal` is dispatched once, at `plan.revealAtMs`, when the strip is visually still. The rAF loop keeps running invisibly until `durationMs`.
- `useCaseOpening(options)`, which returns `{ state, plan, open, viewportRef, stripRef }`.
- `CaseCarousel` / `CaseItem`. The revealed winner cell gets `styles.winner`: a coral border and a lift of `--space-1`.
- `CaseOpening`, which shows a text line `Kết quả: <emoji> <label>` in an `aria-live` region, plus the open/spin-again button.
- Reduced motion: a short token transition, then the reveal.

D-027 defines a **moderate** celebration on reveal. You build it in this task:
1. The winner cell pops, and the other cells dim.
2. One short confetti burst, in-house (no library, D-006).
3. Then a winner panel with a large name.

Not-casino guardrails (D-010) apply: no flashes, no shaking, no rarity colors, no "almost won" messaging. Sound and haptics are Phase 8.

The celebration is **purely derived from `state.status === 'revealed'`**. The state machine, the hook's timing and the domain stay unchanged.

## Scope
- C1: tokens for the celebration.
- C2: winner pop and dimming of the other cells.
- C3: the `Confetti` component (CSS keyframes, deterministic pieces).
- C4: the winner panel, replacing the result text line, with no layout shift.
- C5: reduced motion.

## Out of scope (do NOT do)
- Any change to `packages/domain`, `caseOpeningState.ts` or `useCaseOpening.ts` timing logic.
- Sound, haptics, share, history saving, feedback buttons, "choose again without this option" (later phases).
- New dependencies, animation libraries, canvas, new shared UI primitives, or changes to existing primitives.
- Render, snapshot or E2E tests.

## Files to create / modify
- `apps/web/src/styles/tokens.css`: C1, the only tokens added.
- `apps/web/src/features/case-opening/CaseItem.tsx` / `.module.css`: C2.
- `apps/web/src/features/case-opening/CaseCarousel.tsx`: passes what `CaseItem` needs for C2. Nothing else changes.
- `apps/web/src/features/case-opening/Confetti.tsx` / `Confetti.module.css`: new (C3).
- `apps/web/src/features/case-opening/CaseOpening.tsx` / `.module.css`: stage wrapper and winner panel (C3, C4).
- `apps/web/src/i18n/vi.ts`: one value change (C4).

## Allowed dependencies
None.

## Requirements

### C1. Tokens
Add exactly these to `tokens.css`, each next to the related group, with a short comment:
- `--duration-celebrate: 1200ms;` in the motion group. One-shot celebration burst (confetti).
- `--scale-pop: 1.08;` in the motion group. The winner pop scale.
- `--opacity-dimmed: 0.4;` after the semantic colors. Non-winner cells after the reveal.
- `--z-raised: 1;` in the z group. An element lifted above its siblings.

Components must not contain the raw numbers above. Do not add other tokens.

### C2. Winner pop and dim
`CaseItem` gets `dimmed` in addition to the existing props. `CaseCarousel` passes `revealed && index !== plan.winnerIndex`; there is no new state.
- `.item` transition: `transform var(--duration-normal) var(--ease-spring), opacity var(--duration-normal) var(--ease-standard)`. This replaces the current `--duration-fast` transform transition.
- `.winner`:
  - keeps the coral border
  - `transform: translateY(calc(var(--space-1) * -1)) scale(var(--scale-pop))`
  - `box-shadow: var(--shadow-chunky)`, which changes instantly and is not animated
  - `position: relative; z-index: var(--z-raised)`, so the scaled cell paints above both neighbours
- `.dimmed`: `opacity: var(--opacity-dimmed)`.

Only `transform` and `opacity` animate (rule 10).

The popped winner and its shadow must not be clipped by the viewport, at phone or desktop cell sizes. The current `padding-block: var(--space-3)` on `.viewport` should be enough; if it is not, raise it to `--space-4` and say so in the report. The horizontal math must not change.

When a new spin starts, the pop and the dimming reverse smoothly, because the classes are removed.

### C3. Confetti
`Confetti.tsx` renders one burst. It renders only while revealed: `CaseOpening` mounts it when `state.status === 'revealed'` and unmounts it on the next spin. Every reveal therefore replays the burst, and no timers or JS animation loops are needed.

**Placement:**
- In `CaseOpening`, wrap `CaseCarousel` and `Confetti` in a new `.stage` element with `position: relative`.
- The confetti layer is a sibling **outside** the carousel viewport, so it is not clipped by `overflow: hidden`:
  - `position: absolute; inset: 0`
  - the origin is the stage centre, which is the marker
  - `pointer-events: none`, `aria-hidden="true"`
- On a 360 px phone the burst must not create horizontal page scroll. Add `overflow-x: clip` on `.screen` if needed.

**Pieces:**
- `CONFETTI_PIECES` is a module constant of **20** pieces, computed once and deterministic. Do not use `Math.random`.
- For piece `i`:
  - angle `θ = i × 18°`
  - reach `r = 1.25 + (i % 3) × 0.5`, in units of `--space-8`
  - `x = cos θ × r`, `y = sin θ × r`
  - rotation `±(180 + i × 15)` degrees, with the sign alternating by `i % 2`
  - color index `Math.floor(i / 2) % 3`
  - shape `i % 4 === 0` is a dot, otherwise a strip
- Each piece is a `span`. It passes its vector as CSS custom properties through the React `style` prop, for example `--confetti-x`, `--confetti-y` and `--confetti-rotate`, as unitless numbers. Use custom properties only and no other inline styles. React applies them through CSSOM, which the prod CSP (`style-src 'self'`) allows. Type the prop with a single `as CSSProperties` cast.
- Color classes:
  - `.primary` → `var(--color-primary)`
  - `.secondary` → `var(--color-secondary)`
  - `.accent` → `var(--color-accent)`
- Size:
  - strips are `--space-2` × `--space-3`
  - dots are `--space-2` square with `--radius-pill`

**Animation:** one local `@keyframes`, with `animation: <name> var(--duration-celebrate) var(--ease-out) both`. It animates only `transform` and `opacity`. Units come from `calc(var(--confetti-x) * var(--space-8))`, and rotation from `calc(var(--confetti-rotate) * 1deg)`.
- `0%`: at the origin, `scale(0.4)`, opacity 1.
- `55%`: at `(x, y)`, 60 % of the rotation, scale 1, opacity 1.
- `100%`: at `(x × 1.15, y + 0.75)` (a slight fall), full rotation, opacity 0.

Centre the pieces on the origin with a transform, e.g. `translate(-50%, -50%)` composed first.

After the burst, the pieces stay mounted at opacity 0 until the next spin unmounts them. That is acceptable.

### C4. Winner panel
Replace the text line `Kết quả: <emoji> <label>` with a panel. Use the existing `Card` primitive with `tone="accent"` (lemon with navy text, an allowed pair). Do not change `Card`; pass a `className` for local layout.

**Layout:** horizontal, to keep it short on phones.
- On the left, the emoji at `--text-3xl`, `aria-hidden`.
- On the right, a column:
  - a small label `t('winnerIs')` (`--text-sm`, `--font-weight-bold`)
  - the winner name in `--font-display`, `--font-weight-display`, `--text-xl` on phones and `--text-2xl` from `48rem`
  - wrapping with `overflow-wrap: anywhere`; a 40-character label may wrap to 2 lines
- It may use local padding `--space-4` instead of the Card default.

**Change** `vi.winnerIs` from `'Kết quả:'` to `'Kết quả'`. It is now a label above the name, so it has no colon. Keep the key.

**Live region:** keep the existing `role="status"` / `aria-live="polite"` wrapper. The panel renders inside it only when revealed, so screen readers announce "Kết quả <name>".

**Entrance:**
- the panel animates in with a local `@keyframes`: from opacity 0, `translateY(var(--space-3))`, `scale(0.96)`, to none
- `var(--duration-normal) var(--ease-spring) both`
- `animation-delay: var(--duration-normal)`, so it follows the pop and the start of the burst

**No layout shift:**
- the result slot reserves room with `min-height: calc(var(--space-8) * 2)`, so the button does **not move** when the panel appears
- verify this at 360 px with the longest demo label, and with a 40-character label (temporarily edit `demoPool.ts` locally, but do not commit that edit)
- if `2` is not enough, adjust the multiplier and report the value

### C5. Reduced motion
Under `prefers-reduced-motion: reduce`:
- Confetti is not shown: `display: none` on the layer inside a `@media (prefers-reduced-motion: reduce)` block in `Confetti.module.css`.
- The pop, dimming and panel stay. They already become short, non-springy transitions through the existing token overrides. Do not add more JS.

## Acceptance criteria
- [ ] Before the reveal and during the spin, no cell is popped or dimmed, and no confetti or panel is shown.
- [ ] At the reveal, the winner pops (lift + scale + chunky shadow) above its neighbours without clipping, and the other cells dim. A new spin reverses both smoothly.
- [ ] One confetti burst of 20 pieces comes from the marker, is not clipped by the carousel, does not cause horizontal page scroll at 360 px, and replays on every reveal.
- [ ] The winner panel (accent Card, large name) appears just after the pop. The button does not move. The live region announces "Kết quả <name>".
- [ ] Reduced motion: no confetti; the pop, dim and panel still appear clearly.
- [ ] Only `transform`/`opacity` are animated. No `Math.random`, no timers or JS animation for the celebration, and no per-frame React state.
- [ ] The only new tokens are the four from C1. There are no raw literals in components.
- [ ] Literal greps, the leak check and `make check` pass. Main JS gzip is ≤ 80.6 kB (3-1 was about 79.6 kB).

## Validation
Run these and include the trimmed output in the report:
```bash
make check

grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|cubic-bezier\(|[0-9.]+m?s\b" apps/web/src --include='*.css' --include='*.tsx' --include='*.ts' | grep -v 'apps/web/src/styles/tokens.css'
grep -rnE "[0-9]px" apps/web/src --include='*.css' --include='*.tsx' | grep -v 'apps/web/src/styles/tokens.css'
git grep -nE "Math\.random|setTimeout|setInterval|requestAnimationFrame|\.animate\(" -- apps/web/src/features/case-opening/Confetti.tsx apps/web/src/features/case-opening/CaseOpening.tsx apps/web/src/features/case-opening/CaseItem.tsx
git grep -nE "1\.08|0\.4\b|z-index: [0-9]" -- 'apps/web/src/features/**/*.css'

docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c \
  'pnpm --filter @piko/web build && \
   (grep -rl "DesignPage\|ẤẦẨẪẬ\|Xoay kèo ngay" apps/web/dist && echo "LEAK" || echo "no /design in prod build")'
```
- The first literal grep must print nothing.
- The `px` grep may print only the `DesignPage.tsx` "A 4px base…" prose line.
- The two `git grep` lines must print nothing. The keyframe values `0.4` (scale) and `0.96` are allowed only inside `@keyframes`; if the second grep flags a keyframe line, say so in the report.
- Afterwards delete `apps/web/dist`.
- If the dev server shows old behaviour after you switch branches, run `docker compose -f compose.dev.yaml restart web` (see `docs/ENVIRONMENTS.md`).

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/3-2-celebration` from **`feat/phase-3-case-opening`**, the integration branch.
- Make exactly **one** commit: `feat(web): reveal celebration with winner pop, confetti and winner panel`.
- Do not commit to `main` or to the integration branch. Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including:
   - the test counts
   - the main JS gzip size
4. Deviations from this handoff and why. Include:
   - the final `.viewport` padding
   - the result-slot `min-height` multiplier
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check at `localhost:5173`:
   - phone width (DevTools 360 px) and desktop
   - several spins: does the pop + dim + confetti + panel sequence feel moderate and joyful, not casino-like? Is the timing right after the strip stops?
   - the button does not jump when the panel appears, and there is no horizontal scroll
   - "Quay lại" reverses the celebration cleanly
   - reduced-motion emulation: no confetti, clear reveal
