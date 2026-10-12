# HANDOFF 8-2 — Interaction states

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 8 is the polish phase. The decisions are in **D-035** (`docs/DECISIONS.md`), and the audit findings are in `docs/IMPLEMENTATION_PLAN.md` ("Phase 8 kickoff", findings 4, 5 and 11, plus the focus issue found in the 8-1 review). 8-1 is merged into `feat/phase-8-polish`.

What exists today:

- **Hover is missing on most controls.**
  - `Button`, `Chip`, `Switch`, the builder controls (emoji trigger, emoji picker buttons, remove "×", priority dots), the mode selector, the top-bar links and several text links have no hover state.
  - Some surfaces already have one:
    - Home preset/decision cards: `.presetLink:hover` lifts by `--space-1`.
    - Sidebar rows: `.link:hover` gets a surface background.
    - History rows: `.linkedRow:hover`.
    - Some text links underline on hover: `BackLink`, `seeAll`, `customize`, `makeYourOwn`.
- **Pressed exists:**
  - `Button`, `Chip`, the top-bar `.create`, `NotFoundPage .backHome` and the preset cards move down by the shadow offset and drop the shadow.
  - History rows use a selection background.
- **Loading is a bare "Đang tải…" line.** It appears in:
  - `DecisionLoadState`: preview and edit of a saved decision, rendered centred with no back link.
  - `HistoryPage`.
  - `SharedCasePage` (`LoadingPage`).
  - `ExistingOptionsPanel`.
- **The sidebar "Của bạn" shows only its heading while loading.**
  - When the saved decision arrives, the screen jumps from a centred line to the top-aligned layout.
  - On a fast load the line flashes for a frame.
- **Focused error field:** a `TextField` with an error shows the teal focus ring (`--color-focus-ring`) around its red error border, which looks like two unrelated outlines.
- **Case focus is lost** (found in the 8-1 review, pre-existing).
  - In `CaseOpening.tsx` the focused button unmounts or is disabled during the flow, so `document.activeElement` falls to `<body>` while the modal is open.
  - This happens at the reveal (the "Mở case" button is replaced by the actions), at "Mở lại" / "Không phải hôm nay" (the actions are replaced by the spin button), and after "Đi thôi" succeeds (that button becomes disabled).
  - Keyboard and screen-reader users lose their place.

## Scope
- H: hover and pressed states on every interactive surface.
- L: loading that keeps space, through one shared `LoadingText`.
- E: the focused error field.
- F: focus never falls to `<body>` while the case dialog is open.

## Out of scope (do NOT do)
- **8-3 items:**
  - "Về trang chủ" colours
  - History empty-state alignment
  - the sidebar "Gần đây" on error and its "Xem tất cả"
  - active/current styles ("Lịch sử" underline vs lemon rows)
  - the sticky preview CTA on phones
  - scrolling the active sidebar row into view
  - "Của bạn" rows without an emoji
- Skeletons, shimmer, spinners (D-035: no skeletons).
- New colours. Hover uses movement, the existing surface/selection backgrounds and underline only. No darker/lighter variants of brand colours.
- The case animation, the carousel, selection, routes, requests, copy and i18n keys (`loading` already exists).
- `packages/domain`, `apps/api`, dependencies.

## Files to create / modify
- `apps/web/src/styles/tokens.css`: two motion tokens (H0).
- `apps/web/src/components/ui/Button.module.css`, `Chip.module.css`, `Switch.module.css` / `Switch.tsx` (only if the thumb needs a CSS variable), `TextField.module.css`.
- `apps/web/src/components/ui/LoadingText.tsx` + `LoadingText.module.css` (new).
- `apps/web/src/app/AppNav.module.css`, `NotFoundPage.module.css`, `NavLists.tsx`.
- `apps/web/src/features/home/HomePage.module.css`, `ModeSelector.module.css`.
- `apps/web/src/features/builder/OptionRow.module.css`, `EmojiPicker.module.css`, `PriorityDots.module.css`, `ExistingOptionsPanel.tsx`.
- `apps/web/src/features/decisions/DecisionLoadState.tsx` (+ its CSS), `DecisionPreviewPage.tsx`, `DecisionPreviewPage.module.css`.
- `apps/web/src/features/builder/DecisionBuilderPage.tsx`: pass `backTo` to the load state.
- `apps/web/src/features/history/HistoryPage.tsx`, `features/share/SharedCasePage.tsx`, `SharedLinkList.module.css`.
- `apps/web/src/features/case-opening/CaseOpening.tsx`, `CaseOpening.module.css`: F.
- `apps/web/src/pages/design/*`: show `LoadingText`, a disabled and an enabled control for each primitive, so hover can be checked there.

## Requirements

### H0 — Tokens
Add these to `tokens.css`, next to the motion tokens:
- `--hover-lift: calc(var(--space-1) * -1)` for cards and big tiles.
- `--hover-lift-sm: calc(var(--space-1) * -0.5)` for buttons, chips and small controls.

Replace the literal `calc(var(--space-1) * -1)` in `HomePage.module.css` `.presetLink:hover` with `--hover-lift`.

### H — Hover and pressed rules (apply everywhere)
- **Wrap every hover rule in `@media (hover: hover)`,** so touch devices never keep a stuck hover after a tap. Move the existing unwrapped ones into it: `BackLink`, `seeAll` (Home and sidebar), `customize`, `makeYourOwn`.
- **Never style hover on a disabled control.** Use `:not(:disabled)`, or `:has(input:not(:disabled))` for label-wrapped inputs. A locked "Soon" mode has no hover.
- **Pressed (`:active`) wins over hover.** Declare it after the hover rule, with the same or higher specificity.
- **Animate only `transform` and `opacity`.**
  - Existing `transition: transform var(--duration-fast) …` declarations stay.
  - Background, colour and underline changes are instant (no transition on them).
  - Box-shadow is not animated: pressed already removes it instantly.
- **Reduced motion:** the tokens already shorten durations. No extra rules are needed unless a new transition is added.

### H — Per surface
| Surface | Hover | Pressed |
|---|---|---|
| `Button` (all variants and sizes, not disabled) | lifts by `--hover-lift-sm` | unchanged |
| `Chip` (selected and unselected, not disabled) | lifts by `--hover-lift-sm` | unchanged |
| `Switch` (not disabled) | the thumb lifts by `--hover-lift-sm`, combined with its checked `translateX` (compose both in one `transform`, for example through a CSS variable for the x offset) | thumb back to `translateY(0)` |
| Top bar: "Lịch sử" link | underline, `text-underline-offset: var(--space-1)` | unchanged |
| Top bar / sidebar: `.create` | lifts by `--hover-lift-sm` | unchanged |
| `NotFoundPage .backHome` | lifts by `--hover-lift-sm` | unchanged |
| Home cards (`.presetLink`) | unchanged (now `--hover-lift`) | unchanged |
| `ModeSelector` enabled option (not the checked one) | lifts by `--hover-lift-sm` | none |
| Builder emoji trigger (`.trigger`) | lifts by `--hover-lift-sm` | moves down by `--shadow-offset-sm` |
| Builder remove "×" (`.removeButton`, not disabled) | `--color-selection` background (it is a pill) | none |
| Emoji picker buttons (`.emojiButton`) | `--color-surface` background and `--color-border` border, thin | none |
| Priority dot option | the dot scales to `--scale-pop` | none |
| Preview "Sửa" / "Xóa" text actions, `SharedLinkList` title link | underline, `text-underline-offset: var(--space-1)` | unchanged |
| Sidebar rows, History rows | unchanged | unchanged |

- If a surface is not in the table but is clickable, apply the closest rule above and list it in the report.
- Do not add hover to non-interactive cards (for example the preview option rows; only their `Switch` is interactive).

### L — `LoadingText` and loading that keeps space
- **New primitive `LoadingText`:**
  - `<p role="status" className=…>{t('loading')}</p>`
  - optional `className`
  - muted text colour
  - `opacity: 0` at first, then fades in with `animation: … var(--duration-normal) var(--ease-standard) var(--duration-slow) both`. A load that finishes within `--duration-slow` never shows the line, so fast loads do not flash.
  - **Reduced motion:** the tokens already shorten the delay and the duration. Keep the line readable (no permanent `opacity: 0`).
- **Use it** in place of every `t('loading')` paragraph:
  - `DecisionLoadState`
  - `HistoryPage`
  - `SharedCasePage` (`LoadingPage`)
  - `ExistingOptionsPanel`
  - the sidebar "Của bạn" (new: shown while `decisionState.status === 'loading'`, in the same place as the empty line)
- **`DecisionLoadState` loading keeps the loaded layout:**
  - Add a `backTo` prop. While loading, render `Screen` with `align="start"`, the same `width` and `backTo` the loaded screen uses, and the loading line where the title will appear.
    - The preview page uses `/`.
    - The edit page uses whatever `DecisionForm` uses for an existing decision. Read it, do not guess.
  - The back link and the top of the content do not move when the decision arrives.
  - The error state (retry) stays centred, as today. `notFound` is unchanged.
- **The sidebar "Gần đây" stays hidden while loading and while empty** (D-035). Its error rendering is 8-3's: do not touch it.

### E — Focused error field
- In `TextField.module.css`, `.input.error:focus-visible` uses `--color-danger` for the outline colour (same width and offset as the global focus ring).
  - A focused field with an error then shows one red ring around its red border.
  - A focused valid field keeps the teal ring.
- `--color-danger` is 6.2:1 on cream, so the ring keeps at least 3:1.

### F — Case focus never falls to `<body>`
While the case dialog is open, `document.activeElement` is always inside the dialog:
- **When a spin starts** (first spin, "Mở lại", "Không phải hôm nay"), focus moves to the dialog title `<h2>`.
  - Give it `tabIndex={-1}` and focus it with `focus({ preventScroll: true })`.
  - A programmatically focused title shows no focus ring (`.header h2:focus { outline: none }`). It is not in the Tab order.
- **At the reveal,** focus moves to "Đi thôi" with `preventScroll: true`. The winner is still announced by the existing live result region.
- **After "Đi thôi" succeeds,** the button is disabled ("Đã lưu"). Focus moves to "Mở lại" with `preventScroll: true`.
- **Unchanged:**
  - the initial focus on "Mở case" (8-1)
  - the return focus to "Chia sẻ" after the share dialog closes
  - Esc / × / Back closing
- Implement it with effects keyed on `state.status` and `historySaveStatus`, not with timers.

## Allowed dependencies
- None.

## Acceptance criteria
- [ ] **H, desktop with a mouse:**
  - Every surface in the table shows its hover. Disabled controls and locked modes show none.
  - Pressing still moves a control down and drops its shadow.
- [ ] **H, touch emulation (`hover: none`):** no hover style sticks after a tap.
- [ ] `git grep -n ":hover" -- 'apps/web/src/**/*.css'` shows only rules inside `@media (hover: hover)`, except in `pages/design/*`. List the result in the report.
- [ ] **L:**
  - With the API delayed 3 s, a saved-decision preview keeps "← Trở về" at the same position from loading to loaded, and the loading line appears only after about 400 ms.
  - With no delay, no "Đang tải…" flash is visible.
- [ ] **L:** the sidebar "Của bạn" shows the loading line while loading and never shows a heading alone.
- [ ] **E:** in the builder, saving an empty form and then tabbing into "Tiêu đề" shows one red ring. A valid focused field shows the teal ring.
- [ ] **F, keyboard only:**
  - "Mở case" (Enter): focus is on the title during the spin, then on "Đi thôi" at the reveal.
  - "Mở lại": title, then "Đi thôi".
  - "Đi thôi" succeeds: "Mở lại".
  - `document.activeElement` is never `<body>` while the dialog is open.
  - No visible scroll jump at 1280×800 or 1280×500.
- [ ] No raw colour, duration or shadow literals. No horizontal scroll at 360 and 1280 px.
- [ ] `make check` passes with 0 lint warnings: domain 48, api 50. Lockfile unchanged.

## Validation
```bash
make check
git diff --name-only feat/phase-8-polish... -- apps/web/src | grep "\.css$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" --
git grep -n ":hover" -- 'apps/web/src/**/*.css'
git diff --stat feat/phase-8-polish...
```
- The literal grep must be empty. The two new tokens use the `calc(var(--space-1) …)` form, which has no literal.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.
- To delay or block the API in devtools, match only `/api/*`, never `*/api/*`. The latter also blocks Vite's `/src/lib/api/*` modules.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `feat/8-2-interaction-states` from `feat/phase-8-polish`.
- Commits (suggested):
  - `feat(web): hover and pressed states`
  - `feat(web): LoadingText and loading that keeps the layout`
  - `fix(web): keep focus inside the case dialog`
  - `fix(web): red focus ring on fields with an error`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts, the lint summary and the `:hover` grep
4. Deviations from this handoff and why, including any clickable surface you added that is not in the table
5. Known issues / open questions
6. **The F focus sequence observed** (`document.activeElement` per step) and the **L** back-link position before and after load
7. What the owner should check in the browser:
   - hover on desktop
   - taps on a phone (no stuck hover)
   - a slow load of a saved decision
   - the case flow with the keyboard only
