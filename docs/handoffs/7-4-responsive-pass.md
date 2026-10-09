# HANDOFF 7-4 — Responsive pass

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 7 added:
- **The navigation shell (7-1):** a top bar below `64rem` and a sidebar from `64rem`.
- **The sidebar lists (7-2).**
- **The case overlay (7-3, D-033):** full-screen below `48rem`, a centred `fit-content` dialog from `48rem`.

The architect audited every screen at six viewport sizes:
- **Viewports:** 360×740, 740×360 (phone in landscape), 768×1024, 1024×768, 1280×800, 1920×1080.
- **Screens:**
  - Home, History, a saved-decision preview, the builder, `/s/:id`, not-found
  - the case overlay, ready and revealed

No screen overflows horizontally. Three issues remain:

- **R1: the overlay jumps at the reveal (desktop).**
  - The dialog is centred vertically and sized to its content. When the result and the actions appear, it grows from 562 to 686 px.
  - Its top therefore moves up by about 60 px, and the strip moves with it, at the very moment the winner lands.
- **R2: the overlay title is too large on phones.**
  - The title uses `--text-display` (about 42 px at 360 px), between two 44 px header columns.
  - A short title such as "Tối nay ăn gì?" wraps onto two lines, and a long one takes four, which pushes the strip down.
- **R3: there is an empty band on the public page.**
  - `/s/:id` reserves `calc(var(--space-8) * 2)` (128 px) for the result before any spin.
  - The winner panel is 86–96 px (7-3 measured it). This leaves a large gap between the strip and "Xem lại lượt quay", most visible at 360 and 1920 px.
  - 7-3 already reduced the case overlay's reserve to `calc(var(--space-8) * 1.5)`.

## Scope
- R1–R3 below.

## Out of scope (do NOT do)
- Any change in behaviour, routes, requests or copy.
- The phone-landscape overlay. At 740×360 it is full-screen and scrolls inside, which is accepted.
- Phase 8 polish items:
  - list rows without an emoji start further left
  - scrolling the active sidebar row into view
- `packages/domain`, `apps/api`, dependencies, `components/ui/*`.

## Files to modify
- `apps/web/src/features/case-opening/CaseOpening.module.css`
- `apps/web/src/features/share/SharedCasePage.module.css`

## Requirements

### R1 — Anchor the overlay to the top on desktop
In the `48rem` block of `.dialog`:
- Replace the vertical centring with a top anchor. Use `margin: var(--space-8) auto auto` (the dialog keeps `inset: 0` and `height: fit-content`).
- The dialog then grows **downward** when the result and actions appear. Its top, header and strip do not move at the reveal.
- Change `max-height` to `calc(100dvh - var(--space-8) - var(--space-6))`, so a tall dialog still ends `--space-6` above the bottom and scrolls inside.
- Below `48rem` nothing changes: the overlay stays full-screen.

### R2 — Overlay title size on phones
- Below `48rem`, the overlay title (`.header h2`) uses `--text-2xl`.
- From `48rem` it keeps `--text-display`.
- Long titles still wrap and never run under "×".

### R3 — Public page result reserve
- In `SharedCasePage.module.css`, set `.result`'s `min-height` to `calc(var(--space-8) * 1.5)`, the same as the case overlay.
- Check that the shared result and a "Tự quay thử" result still fit with no layout jump at the reveal, at 360 and 1280 px.

## Acceptance criteria
- [ ] **1280×800 and 1920×1080:**
  - The overlay's top edge is at `--space-8` (64 px) before and after the reveal. The strip does not move when the winner lands.
  - It still scrolls inside at 1280×500.
- [ ] **360×740:**
  - "Tối nay ăn gì?" fits on one line in the overlay header.
  - A 45-character title wraps without overlapping "×".
  - The revealed case still needs no scrolling.
- [ ] **`/s/:id` at 360 and 1920 px:** the gap between the strip and "Xem lại lượt quay" is the normal content gap plus the 96 px reserve. Nothing jumps at the reveal.
- [ ] **No horizontal scroll** on any screen at 360, 768, 1024, 1280 and 1920 px.
- [ ] `make check` passes with 0 lint warnings: domain 48, api 41. Lockfile unchanged.

## Validation
```bash
make check
git diff --name-only feat/phase-7-responsive... -- apps/web/src | grep "\.css$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" --
git diff --stat feat/phase-7-responsive...
```
- The literal grep must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `feat/7-4-responsive-pass` from `feat/phase-7-responsive`.
- Make one commit: `fix(web): anchor the case overlay and tune small-screen spacing`.
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts and the lint summary
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** This is the last Phase 7 task. The owner should check:
   - the overlay reveal on desktop (no jump)
   - the overlay title on a phone
   - `/s/:id` on a phone and on desktop
   - then a full Phase 7 walk-through on phone, tablet and desktop
