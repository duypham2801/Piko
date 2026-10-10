# HANDOFF 8-3 — Consistency and layout

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 8 is the polish phase. 8-1 (case polish) and 8-2 (interaction states) are merged into `feat/phase-8-polish`. The decisions are in **D-035**, including its 8-2 amendment, in `docs/DECISIONS.md`. Two points from that amendment matter here:
- The saved-decisions section is now called **"Sổ tay"**.
- It is hidden in the sidebar while loading or empty.

This last task covers the remaining audit findings (`docs/IMPLEMENTATION_PLAN.md`, "Phase 8 kickoff", findings 6–10 and 12a), plus one item from the 8-1 review.

What exists today:

- **C1: "Về trang chủ" has two looks.**
  - `NotFoundPage` (also used for the unavailable share page `/s/:id`) renders a `Link` with its own `.backHome` CSS. That CSS is a teal copy of `Button` styles.
  - The empty History page uses `<Button onClick={() => navigate('/')}>`, which is coral, and it is a button, not a link.
- **C2: History states are centred under left-aligned headings.** `HistoryPage.module.css` `.state` uses `justify-items: center; text-align: center`, while the page headings are start-aligned. On desktop, the empty message and its button float in the middle of the column.
- **C3: "Xem tất cả" shows on a failed list.** When the recent history fails to load, both the sidebar "Gần đây" (`NavLists.tsx`) and Home's `RecentSection` (`HomePage.tsx`, phones) show the heading with a "Xem tất cả" link above "Chưa tải được lịch sử.".
- **C4: two different "current page" styles in the sidebar.**
  - The current "Lịch sử" link uses teal text with an underline (`AppNav.module.css`, `.history[aria-current='page']`).
  - The current decision row uses a lemon fill (`NavLists.module.css`, `.link[aria-current='page']`).
  - In the desktop sidebar they sit together and look unrelated.
- **C5: the preview "MỞ CASE" is far down on phones.**
  - On `/presets/:slug` and `/decisions/:id`, `DecisionPreview` puts the button after every option row. A preset has 8 rows, so the main action is several screens down.
  - The builder already pins its actions to the bottom (`DecisionForm.module.css`, `.actionBar`).
- **C6: the active sidebar row can be out of view.** The "Sổ tay" list scrolls on its own (`.decisionsSection .list { overflow-y: auto }`). When the current decision is low in a long list, its highlighted row is hidden.
- **C7: decisions without an emoji have no icon.**
  - Sidebar "Sổ tay" rows and Home decision cards show `decision.options.find((o) => o.emoji)?.emoji` only.
  - When no option has an emoji, the label starts further left than in other rows. On Home there is a blank spot where the icon should be.
  - 8-1 added `OptionGlyph` (emoji, or a monogram of the label) for exactly this.

## Scope
- C1–C7 below.

## Out of scope (do NOT do)
- The top-bar / sidebar "+ Tạo" pill (`.create`). It keeps its own pill look.
- Hover, pressed, focus and loading (done in 8-2). Keep every rule 8-2 added.
- Any change to routes, requests, the case overlay, selection or copy. The only exception is the i18n removal noted in C1, if a key becomes unused.
- `packages/domain`, `apps/api`, dependencies.

## Files to create / modify
- `apps/web/src/components/ui/Button.tsx`: export a class helper (C1).
- `apps/web/src/app/NotFoundPage.tsx` and `NotFoundPage.module.css`: C1.
- `apps/web/src/features/history/HistoryPage.tsx` and `HistoryPage.module.css`: C1, C2.
- `apps/web/src/app/NavLists.tsx` and `NavLists.module.css`: C3, C6, C7.
- `apps/web/src/features/home/HomePage.tsx`: C3, C7.
- `apps/web/src/app/AppNav.module.css`: C4.
- `apps/web/src/features/preview/DecisionPreview.tsx` and `DecisionPreview.module.css`: C5.
- `apps/web/src/pages/design/ComponentsSection.tsx`: show a link styled with the button helper.

## Requirements

### C1 — One "Về trang chủ": a link that looks like a primary Button
- **In `Button.tsx`,** export `buttonClassName({ variant, size, fullWidth, className })`. It returns the same class string `Button` builds today, and `Button` itself uses it. Defaults are unchanged: `primary` / `md` / `false`.
- **Use it on a router `Link`** for "Về trang chủ":
  - in `NotFoundPage`, which also covers the unavailable `/s/:id` page
  - in the empty History state
  - Both use the **primary** variant at the default size. It is the only action on those screens.
- **Delete** `.backHome` and its hover/pressed rules from `NotFoundPage.module.css`. The `Button` styles (including the 8-2 hover lift) now apply.
- **Remove** `useNavigate` / `navigate` from `HistoryPage.tsx` if nothing else uses them.
- **`Button.module.css` must keep working on an `<a>`.** Its `:not(:disabled)` selectors match links. Check that the link has no underline and no visited colour. If it does, add `text-decoration: none` to `.button`.

### C2 — History states align with the headings
- In `HistoryPage.module.css`, `.state` uses `justify-items: start; text-align: start`. This applies to both the empty state and the error/retry state.
- Nothing else on the page changes.

### C3 — No "Xem tất cả" on a failed list
- When the recent history failed to load, the "Gần đây" header shows the heading only, without "Xem tất cả", above the failure line. Apply this to both:
  - the sidebar (`NavLists.tsx`)
  - Home `RecentSection` (`HomePage.tsx`)
- The loaded state is unchanged.
- Visibility does not change either. "Gần đây" is still hidden while loading or empty (D-035) and shown on error.

### C4 — One "current" style in the desktop sidebar
- From `64rem` (inside the existing `@media (min-width: 64rem)` block in `AppNav.module.css`), the current "Lịch sử" link looks like a current sidebar row:
  - `--color-selection` background
  - `--radius-md`
  - `--color-text`
  - bold
  - no underline
- Its hover, from `64rem` and inside `@media (hover: hover)`, matches the sidebar rows:
  - a `--color-surface` background
  - no underline
- Below `64rem` (the top bar), keep today's current style (teal text and underline) and today's hover.

### C5 — Sticky "MỞ CASE" on phones (D-035)
- In `DecisionPreview`, wrap the min-options hint (when shown) and the "MỞ CASE" button in an action bar.
- **Below `48rem`,** the bar is `position: sticky; bottom: 0`, using the same values as the builder's `.actionBar`:
  - `--z-raised`
  - `--color-bg` background
  - padding `var(--space-3) 0 calc(var(--space-3) + env(safe-area-inset-bottom))`
  - The button is full width in the bar.
- **From `48rem`,** the bar is static, and the button stays centred at its natural width, as today.
- **`children`** (the saved decision's "Sửa" / "Xóa" with the inline delete confirm, and the preset's "Tùy chỉnh") stay **after** the bar, in the normal flow. When the user scrolls to the end, the bar settles above them, as the builder's bar does.
- The bar must not cover the last option row. When scrolled to the bottom, every row and the children are fully visible above the screen's bottom edge.
- The case overlay (opened from this button) is unchanged.

### C6 — Keep the current sidebar row in view
- In `NavLists`, after the list renders and whenever `pathname` changes, take the current row (`[aria-current='page']`) inside the "Sổ tay" list.
- If it is outside the list's visible area, scroll the **list**, not the page, so the row is visible. Use `scrollIntoView({ block: 'nearest' })`, or set the list's `scrollTop`. No smooth scrolling.
- Do nothing when the row is already visible, or when there is no current row.

### C7 — Icons for decisions without an emoji
- Sidebar "Sổ tay" rows and Home decision cards render `<OptionGlyph emoji={firstEmoji} label={decision.title} />`, in place of the conditional emoji span. The existing class keeps the size: `styles.emoji` in the sidebar, `styles.presetEmoji` on Home.
- Labels in sidebar rows now start at the same x, with or without an emoji, and line up with the "Gần đây" rows.
- Preset cards are unchanged: presets always have an emoji.
- Do not rename `OptionGlyph`.

## Allowed dependencies
- None.

## Acceptance criteria
- [ ] **C1:**
  - "Về trang chủ" is a coral primary link-button on not-found, on the unavailable `/s/:id` page and on the empty History page.
  - It navigates with a normal link: middle-click opens a new tab.
  - `.backHome` no longer exists.
  - `git grep -n "backHome" -- 'apps/web/src/**/*.css'` is empty.
- [ ] **C2:** at 1280×800, the empty History message and its button start at the same x as the "Đã chọn" heading.
- [ ] **C3:** with the API refused, neither the sidebar nor Home (360 px) shows "Xem tất cả" under "Gần đây".
- [ ] **C4:** at 1280×800 on `/history`, the "Lịch sử" link has the same lemon fill and shape as a current decision row on `/decisions/:id`. At 360 px the top-bar style is unchanged.
- [ ] **C5:**
  - At 360×740, on `/presets/food` and on a saved decision with 8 options, "MỞ CASE" is visible without scrolling and stays pinned while scrolling.
  - At the end of the page, the last row and "Sửa / Xóa" or "Tùy chỉnh" are fully visible.
  - At 1280×800 the layout is unchanged.
- [ ] **C6:** with 20 saved decisions at 1280×800, opening the 20th from Home shows its highlighted row in the sidebar without manual scrolling.
- [ ] **C7:** a decision whose options have no emoji shows a monogram in the sidebar and on its Home card (360 px), and its label lines up with the other rows.
- [ ] No raw colour, duration or shadow literals. No horizontal scroll at 360, 768, 1280 and 1920 px.
- [ ] `make check` passes with 0 lint warnings: domain 48, api 50. Lockfile unchanged.

## Validation
```bash
make check
git diff --name-only feat/phase-8-polish... -- apps/web/src | grep "\.css$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" --
git grep -n "backHome" -- 'apps/web/src/**/*.css'
git diff --stat feat/phase-8-polish...
```
- Both greps must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.
- To refuse the API in devtools, block only `/api/*`, never `*/api/*`. The latter also blocks Vite's `/src/lib/api/*` modules.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `feat/8-3-consistency-layout` from `feat/phase-8-polish`.
- Commits (suggested):
  - `refactor(web): link-styled buttons for "Về trang chủ"`
  - `fix(web): align History states and hide "Xem tất cả" on errors`
  - `fix(web): one current style in the sidebar and keep it in view`
  - `feat(web): sticky preview action on phones`
  - `fix(web): glyphs for decisions without an emoji`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts, the lint summary and both greps
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** This is the last Phase 8 task. The owner should check:
   - a preset and a saved decision on a phone (sticky "MỞ CASE")
   - the sidebar on desktop (one current style, the current row in view, monograms)
   - not-found, an expired share link and an empty History
   - then a full Phase 8 walk-through on phone and desktop, including hover with a real mouse
