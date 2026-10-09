# HANDOFF 7-3 — Case opening as an overlay

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Read **D-033** in `docs/DECISIONS.md` first. It replaces D-032's "focus mode".

Today `CaseOpening` is a full screen rendered by three pages:

| Page | Route | Notes |
|---|---|---|
| `PresetCasePage` | `/presets/:slug/open` | |
| `DecisionCasePage` | `/decisions/:id/open` | loads the record again with `useDecisionRecord` |
| `DecisionForm` | the builder with `?view=case` | renders `CaseOpening` **instead of** the form |

7-1 hides the navigation on those screens with `Screen focus` → `data-focus` and a `:has([data-focus])` rule in `app/AppShell.module.css`.

**The owner decided:**
- **Overlay:** the case opens as an **overlay dialog** above the page it was opened from (the preview or the builder), with a dimmed, blurred backdrop.
- **URLs stay:**
  - `/presets/:slug/open`, `/decisions/:id/open` and `?view=case` still exist.
  - The browser Back button closes the overlay.
  - A deep link to `/open` shows the preview with the overlay above it.
- **Phone:** below `48rem` the overlay is full-screen.
- **Closing:** by a "×" button or `Esc` (also during a spin). A backdrop click does **not** close it.
- **Focus mode** and its CSS go away.
- **`/s/:id` stays a normal page.**

This task also includes three small layout items from the 7-2 review and the architect's responsive audit (C0).

## Scope
- O1: nested `/open` routes rendering above the preview.
- O2: `CaseOpening` as a modal `<dialog>`.
- O3: the builder renders the form with the overlay above it.
- O4: remove focus mode.
- C0: sidebar and result-area layout fixes.

## Out of scope (do NOT do)
- Any change to selection, the animation plan, the carousel math, `useCaseOpening`, "Đi thôi"/"Mở lại"/"Không phải hôm nay"/"Chia sẻ" behaviour or requests.
- `SharedCasePage` (`/s/:id`) and `Sheet`.
- New dependencies, API or domain changes, URL changes.
- Other responsive tuning (that is 7-4).

## Files to modify
**Routes and pages:**
- `apps/web/src/app/App.tsx`
- `apps/web/src/features/presets/PresetPreviewPage.tsx`
- `apps/web/src/features/presets/PresetCasePage.tsx`
- `apps/web/src/features/decisions/DecisionPreviewPage.tsx`
- `apps/web/src/features/decisions/DecisionCasePage.tsx`
- `apps/web/src/features/preview/DecisionPreview.tsx`: remove `openState`

**Case opening:**
- `apps/web/src/features/case-opening/CaseOpening.tsx` + `.module.css`
- `apps/web/src/features/builder/DecisionForm.tsx`

**Shell and styles:**
- `apps/web/src/app/Screen.tsx`, `apps/web/src/app/AppShell.module.css`: remove focus mode
- `apps/web/src/app/NavLists.module.css`: C0
- `apps/web/src/styles/tokens.css`: `--case-dialog-max-width`, `--blur-backdrop`

## Requirements

### O1 — Nested routes
**`App.tsx`:**
```tsx
<Route path="/presets/:slug" element={<PresetPreviewPage />}>
  <Route path="open" element={<PresetCasePage />} />
</Route>
<Route path="/decisions/:id" element={<DecisionPreviewPage />}>
  <Route path="open" element={<DecisionCasePage />} />
</Route>
```
`/decisions/:id/edit` and `/decisions/new` stay separate routes.

**Preview pages:**
- Both preview pages render `<Outlet />` after their `DecisionPreview`. The preview stays mounted while the overlay is open.
- **`DecisionPreviewPage`:**
  - Renders `<Outlet context={record} />` only in its loaded state.
  - The loading, not-found and error states stay as they are, with no outlet.
  - A deep link to `/decisions/:id/open` therefore shows the load state first, then the preview with the overlay.

**`DecisionCasePage`:**
- Reads the record with `useOutletContext<DecisionRecordData>()`.
- Removes its own `useDecisionRecord`, `DecisionLoadState` and `NotFoundPage` use. There is no second record fetch.
- It keeps `useOffOptions` and the `key` on `CaseOpening`.

**`PresetCasePage`:**
- Keeps `findPreset`. The preview already renders `NotFoundPage` for an unknown slug, so the outlet never renders then.
- Remove the `NotFoundPage` branch if it becomes unreachable. Otherwise keep it and say why.

**Page titles:** remove the `<title>` from both case pages. The preview's `<title>` is the same text.

**`DecisionPreview`:** remove the `openState` prop and the `state` passed to `navigate`. `DecisionPreviewPage` stops passing it.

### O2 — `CaseOpening` dialog
**Dialog shell:**
- `CaseOpening` renders its own `<dialog>`, opened with `showModal()` in a mount effect, the same pattern as `Sheet`. Do not change `Sheet`.
- Give it `aria-labelledby` pointing at the case title, which becomes an `<h2>` (the page behind keeps its `<h1>`).

**Header row:**
- the title, centred as today
- a close button at the end:
  - `Button variant="outline"`
  - visible "×" (`aria-hidden`), `aria-label={t('close')}`
  - at least `--tap-target-min` square
- The `BackLink` and `Screen` are no longer used in `CaseOpening`.

**Closing:**
- **"×":** calls `dialog.close()`.
- **`Esc`:** the native `cancel` → `close`. It is allowed at any time, including mid-spin.
- **`onClose`** of the dialog calls `navigate(backTo, { replace: true })`, so closing does not leave an `/open` entry for Back to reopen.
- **Backdrop clicks do nothing:** no click handler on the dialog.
- **Focus:** the browser returns focus to the element focused before `showModal()` (the preview's or builder's "Mở case") because that page stays mounted. Do not add manual focus code for this.
- **Initial focus:** the primary button ("Mở case") gets `autoFocus`, not the "×".

**Share:** `ShareDialog` (a `Sheet`) still opens from inside the overlay as a stacked modal. Its `Esc` closes only the share dialog, and its focus return to `#case-share-toggle` still works.

**Size and look** (tokens only):
- **Below `48rem`:**
  - full-screen: `inset: 0; width: 100%; height: 100dvh; max-width: none; max-height: none; margin: 0`
  - no border radius and no border
  - `--color-bg` background
  - padding `var(--space-4)`, plus `env(safe-area-inset-top/bottom)`
  - content scrolls inside if needed
- **From `48rem`:**
  - centred: `margin: auto`
  - `width: min(calc(100% - var(--space-6) * 2), var(--case-dialog-max-width))`
  - `max-height: calc(100dvh - var(--space-6) * 2)`, with `overflow-y: auto`
  - `--border-width` `--color-border` border, `--radius-lg`, `--shadow-chunky`, `--color-bg` background
  - padding `var(--space-6)`
- **Backdrop:**
  - `background: var(--color-backdrop)` and `backdrop-filter: blur(var(--blur-backdrop))`
  - inside `@media (prefers-reduced-transparency: reduce)`: no blur, only the backdrop colour
- **New tokens in `tokens.css`:**
  - `--case-dialog-max-width: 72rem`
  - `--blur-backdrop: 8px`, with a comment that this is the backdrop blur radius
- **Inner layout:** the content inside keeps today's structure and classes:
  - the stage uses the full dialog width
  - the result, actions and hint stay in the narrow `--content-max-width` column, centred
- **Open animation:**
  - opacity + a small `translateY` (`--space-3`), with `--duration-normal` `--ease-out`
  - none under `prefers-reduced-motion: reduce`
  - Only transform/opacity.

### O3 — Builder
- `DecisionForm` always renders the form.
- When `isCaseView && parsed.success`, it **also** renders `CaseOpening` (the overlay), with the same props as today. `backTo` stays `caseBackTo`, so closing removes `view=case`.
- The existing effect that drops `view=case` for an invalid draft stays.

### O4 — Remove focus mode
- Remove the `focus` prop and `data-focus` from `Screen`.
- Remove both `:has([data-focus])` rules from `AppShell.module.css`.
- Behind the overlay, the nav stays visible (dimmed and blurred). That is intended.

### C0 — Small layout fixes
**`NavLists.module.css`:**
- Give the "Của bạn" heading the same `--space-2` spacing below as "Gần đây". Today it touches the list and the empty line.
- Delete `.list > li { min-width: 0 }`. It is redundant with `grid-template-columns: minmax(0, 1fr)`.
- Change "Của bạn" from `flex: 1 1 auto` to `flex: 0 1 auto`. It still scrolls when long, but when short, "Gần đây" sits right under it instead of at the bottom of a tall window. Check this at 1920×1080.

**`CaseOpening.module.css` `.result`:**
- `min-height` reserves space for the winner panel so nothing jumps at the reveal. Today it is `calc(var(--space-8) * 2)` (128 px), while the panel is about 85–95 px tall. This leaves an empty band above "Đi thôi", and the revealed case scrolls at 360×740.
- Set it to the smallest token expression that is still ≥ the one-line panel height at both 360 and 1280 px, for example `calc(var(--space-8) * 1.5)`.
- Report the measured panel heights.

## Acceptance criteria
- [ ] **Preset preview:** "Mở case" opens the overlay above the still-visible preview.
  - The URL is `/presets/<slug>/open` (with `?off=` kept).
  - The backdrop is dimmed and blurred at 1280 px.
  - The case is full-screen at 360 px.
- [ ] **Saved decision:** the same works from `/decisions/<id>`, with no second `GET /api/decisions/<id>` when opening.
- [ ] **Builder:** "Mở case" opens the overlay above the form. Closing returns to the form with the draft intact and `view=case` removed.
- [ ] **Closing:**
  - "×", `Esc` (also mid-spin) and browser Back each close the overlay.
  - Focus returns to the page's "Mở case" ("×" and `Esc`).
  - A backdrop click does nothing.
  - After closing with "×", browser Back does not reopen the overlay.
- [ ] **Deep link:** a fresh load of `/decisions/<id>/open` shows the preview with the overlay. A fresh load of `/presets/nope/open` shows "Không tìm thấy trang".
- [ ] **Unchanged behaviour:**
  - spin, reveal, confetti, "Đi thôi" (one `POST /api/history`), "Mở lại" and "Không phải hôm nay" behave as before
  - reduced motion still does the short reveal
- [ ] **Share:** "Chia sẻ" opens the share dialog above the overlay. Its `Esc` closes only it, and focus returns to "Chia sẻ".
- [ ] **Focus mode removed:** `git grep -n "data-focus\|focus?: boolean" -- apps/web/src` is empty.
- [ ] **Sidebar at 1920×1080, few decisions:** "Gần đây" sits right under "Của bạn". With 20 decisions at 1280×800, "Của bạn" still scrolls alone.
- [ ] **Small screen:** the revealed case at 360×740 needs no scrolling.
- [ ] **Public page:** `/s/<id>` is unchanged.
- [ ] `make check` passes with 0 lint warnings: domain 48, api 41. Lockfile unchanged.

## Validation
```bash
make check
git grep -n "data-focus\|focus?: boolean" -- apps/web/src
git grep -n "useDecisionRecord" -- apps/web/src
git diff --name-only feat/phase-7-responsive... -- apps/web/src | grep "\.css$" | grep -v tokens.css | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" --
git diff --stat feat/phase-7-responsive...
```
- The literal grep must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `feat/7-3-case-overlay` from `feat/phase-7-responsive`.
- Suggested commits:
  1. `feat(web): open the case as an overlay`
  2. `refactor(web): remove focus mode`
  3. `fix(web): sidebar and result spacing`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts and the lint summary
4. Deviations from this handoff and why
5. Known issues / open questions (include the measured winner panel heights)
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check:
   - opening a case on desktop (blurred backdrop) and on a phone (full-screen)
   - closing with ×, `Esc` and Back
   - sharing from the overlay
