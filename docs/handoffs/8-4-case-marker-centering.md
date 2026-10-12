# HANDOFF 8-4 — Case marker arrows and a centred case

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 8 (polish, D-035) is done on `feat/phase-8-polish`: 8-1, 8-2 and 8-3 are merged. The owner's browser walk-through found two problems in the case screen (`apps/web/src/features/case-opening/`). Everything else passed.

### M — The marker arrows point the wrong way and get covered at the reveal
- **Today's arrows:** `CaseCarousel.module.css` draws them as the `.marker::before` (top) and `.marker::after` (bottom) border triangles.
  - The top one points **up** (`border-bottom` coloured) and the bottom one points **down**. Both point away from the strip.
  - The owner wants each to have **one tip pointing inward**, at the strip: the top arrow points down and the bottom arrow points up.
- **Geometry today:**
  - The marker spans the whole `.viewport` (`top: 0; bottom: 0`). The viewport has `padding-block: var(--space-3)`. Each arrow is `--space-2` tall.
  - So at rest the top arrow fills 0–8 px and the cells start at 12 px.
- **At the reveal**, the winner cell (`CaseItem.module.css`, `.winner`) gets `translateY(calc(var(--space-1) * -1)) scale(var(--scale-pop))`.
  - Measured at 1280×800: its box goes from 199–359 to 189.0–361.8 (cell 160 px).
  - At 360×740 it goes from 104–232 to 94.9–233.1 (cell 128 px).
  - Its top edge rises about 9–10 px, into the arrow, while the arrows stay put.
  - The arrows cannot simply move out with it: they are inside `.viewport`, which is `overflow: hidden`.

### C — The case sits too high
- **Desktop (from `48rem`):**
  - 7-4 anchored the dialog `--space-8` from the top (`margin: var(--space-8) auto auto`, `height: fit-content`). This is so it does not jump when the actions appear at the reveal.
  - The dialog grows from 544 px (ready) to 648 px (revealed).
  - At 1920×1080 it ends at 712, leaving 368 px empty below it.
- **Phone (below `48rem`):**
  - The dialog is full screen, and the content stacks from the top: the strip at 92–244 and the content ending at 462 (ready) / 588 (revealed).
  - That leaves 278 px / 152 px empty at the bottom of a 740 px screen.
- **The owner wants the case vertically centred,** on both.

## Scope
- M: inward-pointing arrows that move outward with the winner's edges at the reveal.
- C: the case block vertically centred on desktop and on phones, without any movement of the strip at the reveal.

## Out of scope (do NOT do)
- The marker line and its fade at the reveal (8-1). Keep it, and keep it between the arrows.
- Cell sizes, the strip, the animation plan, `revealAtMs`, timing, the winner pop itself, and the confetti.
- Copy, i18n, routes, requests, focus logic (8-2), the share dialog.
- `packages/domain`, `apps/api`, dependencies.

## Files to modify
- `apps/web/src/features/case-opening/CaseCarousel.tsx` and `CaseCarousel.module.css`: M.
- `apps/web/src/features/case-opening/CaseOpening.tsx` and `CaseOpening.module.css`: C.
- `apps/web/src/features/share/SharedCasePage.module.css`: only if M needs room on `/s/:id` (it uses `CaseCarousel` too).

## Requirements

### M1 — Arrow shape
- The top arrow is a down-pointing triangle: its flat base is on top, and its tip points at the strip.
- The bottom arrow is an up-pointing triangle.
- Size, colour (`--color-primary`) and horizontal centring are unchanged.

### M2 — Arrows outside the clip
- Render the marker outside the `overflow: hidden` element, so the arrows can move beyond the strip's top and bottom without being cut off.
  - For example, make `CaseCarousel`'s root a `position: relative` wrapper that holds the clipped `.viewport` and the marker as siblings.
- **`viewportRef` must stay on the clipped element.** `useCaseOpening` measures it.
- Move `--case-cell-width` (and its `48rem` override) to the wrapper, so the marker can use it.
- **The strip's own height does not change.** The arrows may move into the gap above and below the stage, but no layout height around them grows.

### M3 — Arrow positions
- **Before the reveal** (ready and spinning):
  - The top arrow's tip is `--space-1` above the cells' top edge.
  - The bottom arrow's tip is `--space-1` below their bottom edge.
  - This is what today's geometry already gives once flipped: the base sits at the viewport edge.
- **At the reveal,** the arrows follow the winner's edges, keeping the same `--space-1` gap:
  - The top arrow moves up by `calc(var(--space-1) + (var(--scale-pop) - 1) * var(--case-cell-width) / 2)`.
  - The bottom arrow moves down by `calc((var(--scale-pop) - 1) * var(--case-cell-width) / 2 - var(--space-1))`.
  - Derive both from the same tokens the winner uses. No magic numbers.
- **On the next spin** they return to their resting position.
- **Animate `transform` only,** with the winner's transition: `--duration-normal` / `--ease-spring`.
  - Reduced motion is handled by the tokens.
  - The move-back on a new spin may be instant, like the line in 8-1.
- The arrows draw above the winner cell, never under it.

### C1 — A centred case that does not move at the reveal
- **Centring:**
  - **Desktop:** the dialog is vertically centred in the viewport.
  - **Phone:** the case block (stage, result, actions) is vertically centred in the space under the header row. The title and "×" stay at the top, where they are today.
  - Safe-area padding is unchanged.
- **The strip must not move when the winner lands.**
  - Reserve, in the ready and spinning states, the height the revealed state needs: the result panel (already reserved), the actions, and **one** status line (the 2-option hint or the history error).
  - The block's height is then the same before and after the reveal, and centring cannot shift it.
- **Suggested approach:**
  - Put "Mở case" and the revealed actions in one footer area whose `min-height` equals the revealed actions plus one status line. Derive it from tokens: the button heights come from `--tap-target-min`, the `lg` padding, the gaps and the line height.
  - "Mở case" sits at the top of that area.
  - Measure it, and say in the report how you derived it.
  - Any equivalent that keeps the strip still is fine.
- **Only one case may grow:** when the hint **and** the error are both shown (2 options with the API refused). Then the block may move by at most half a status line.
- **Keep the 8-1 / 7-4 behaviour at short heights:**
  - At 1280×500 the dialog still scrolls inside, opens at `scrollTop` 0 and keeps "Mở case" focused.
  - At 740×360 (phone landscape) it scrolls inside.
- **No inner scroll at 1280×800 or 360×740** in the normal, hint or error states.

## Allowed dependencies
- None.

## Acceptance criteria
- [ ] **M1:** both arrows point inward at the strip, in the ready, spinning and revealed states, in the overlay and on `/s/:id`.
- [ ] **M3** at 1280×800 and at 360×740:
  - Before the reveal, each arrow tip is `--space-1` (±1 px) from the cells' edge.
  - After the reveal, it is the same distance from the winner's scaled edge.
  - No arrow overlaps the winner cell. Report the measured tip and edge positions.
- [ ] **M3:** "Mở lại" puts the arrows back at rest for the new spin.
- [ ] **C1, centring:**
  - At 1280×800 and 1920×1080, the space above and below the dialog differs by no more than `--space-4`.
  - At 360×740 and 390×844, the space above and below the case block (under the header row) differs by no more than `--space-4`.
- [ ] **C1, no movement:** the strip's top is the same (±1 px) in the ready and revealed states, at all four sizes, for a preset and for a 2-option decision (hint shown).
- [ ] **C1, short heights:** at 1280×500 and 740×360 the dialog scrolls inside, the initial `scrollTop` is 0, and focus is on "Mở case".
- [ ] No raw colour, duration or shadow literals. No horizontal scroll at 360, 768, 1280 and 1920 px.
- [ ] `make check` passes with 0 lint warnings: domain 48, api 50. Lockfile unchanged.

## Validation
```bash
make check
git diff --name-only feat/phase-8-polish... -- apps/web/src | grep "\.css$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" --
git diff --stat feat/phase-8-polish...
```
- The literal grep must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `fix/8-4-case-marker-centering` from `feat/phase-8-polish`.
- Commits (suggested):
  - `fix(web): inward case arrows that follow the winner`
  - `fix(web): centre the case without moving the strip`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts and the lint summary
4. Deviations from this handoff and why
5. Known issues / open questions
6. **Measurements:**
   - the arrow tips vs the cell/winner edges (M3)
   - the space above/below and the strip top before/after the reveal (C1), at each size
   - how the reserved footer height was derived
7. **PHASE READY FOR VISUAL REVIEW.** The owner should check:
   - the arrows before and after the reveal
   - the case position on desktop and on a phone
