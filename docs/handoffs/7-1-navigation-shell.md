# HANDOFF 7-1 — Navigation shell

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 7 adds a navigation shell and a responsive pass. The decisions are in **D-032** in `docs/DECISIONS.md`; read it first.

Today the app has **no navigation** besides per-screen back links.
- **Copied layout:** every screen repeats the same layout block in its own CSS module: `.screen` (`min-height: 100dvh`, padding, background) + `.content` (a centred grid column) + a `48rem` media query.
  - It is copied in 8 places: Home, History, the builder form, the shared preview, the decision load state, NotFound, CaseOpening and the public `SharedCasePage`.
  - The back link sits wherever each screen puts it. On the case screen it is inside a vertically centred column, so it moves with the content.
- **Routes:** `apps/web/src/app/App.tsx` puts every route except `/s/:id` inside `SessionLayout`.
- **Case screen:** `CaseOpening` is rendered by three pages:
  - `PresetCasePage` (`/presets/:slug/open`)
  - `DecisionCasePage` (`/decisions/:id/open`)
  - the builder itself with `?view=case` (`DecisionForm`)

This task builds the shell and the shared screen layout.
- The sidebar has **no lists** yet. "Của bạn" and "Gần đây" come in 7-2.
- Home is **not** changed beyond its layout block.

## Scope
- N1: one navigation component, shown as a top bar below `64rem` and as a sidebar from `64rem`.
- N2: an `AppShell` layout route around every session route.
- N3: a `Screen` layout component used by every screen, with the back link always at the top-left of the same column.
- N4: focus mode: no navigation at any width while `CaseOpening` is on screen.
- N5: remove the copied layout blocks.

## Out of scope (do NOT do)
- "Của bạn"/"Gần đây" in the sidebar, data fetching in the shell, and Home section changes (7-2).
- Per-screen responsive tuning (carousel size, card grids, CTA layout) (7-3).
- Changing any back-link target, copy (other than the new nav keys), behaviour, requests or the session bootstrap.
- `packages/domain`, `apps/api`, dependencies, `/design`, `components/ui/*` (except as stated).
- A global store, context or effect to toggle focus mode (use the CSS rule in N4).

## Files to create / modify
**Create:**
- `apps/web/src/app/AppShell.tsx` + `AppShell.module.css`: layout route (shell grid + nav + `<Outlet />`)
- `apps/web/src/app/AppNav.tsx` + `AppNav.module.css`: the navigation
- `apps/web/src/app/Screen.tsx` + `Screen.module.css`: the screen layout

**Modify:**
- `apps/web/src/app/App.tsx`: nest the session routes in `AppShell`
- `apps/web/src/styles/global.css`: `#root` grid (see N3)
- `apps/web/src/styles/tokens.css`: `--sidebar-width`
- `apps/web/src/i18n/vi.ts`: nav keys
- Screens that switch to `Screen`, with their CSS modules:
  - `features/home/HomePage.tsx`
  - `features/history/HistoryPage.tsx`
  - `features/builder/DecisionForm.tsx`
  - `features/preview/DecisionPreview.tsx`
  - `features/decisions/DecisionLoadState.tsx`
  - `app/NotFoundPage.tsx`
  - `features/case-opening/CaseOpening.tsx`
  - `features/share/SharedCasePage.tsx`

## Requirements

### N1 — `AppNav`
**Markup:** a single `<nav aria-label={t('navLabel')}>`. It is rendered once, with no second copy for mobile. It contains:
- **Logo:** a `Link` to `/` showing the wordmark `t('title')` in the display font, like Home's `.wordmark` but smaller (`--text-2xl`).
- **"Lịch sử":** a `NavLink` to `/history`, text `t('historyTitle')`. Use the `aria-current="page"` that `NavLink` sets to style the active state (bold + `--color-text-accent` underline or similar, using tokens).
- **"+ Tạo":** a `Link` to `/decisions/new`.
  - Visible text: `+` (`aria-hidden`) and `t('navCreate')` ("Tạo").
  - `aria-label={t('builderNewTitle')}`.
  - Styled as a compact primary pill. Reuse the button look via tokens; do not render a `<button>` inside the link.

**Below `64rem` (top bar):**
- one row
- the logo on the left, "Lịch sử" and "+ Tạo" on the right
- padding `var(--space-3) var(--space-4)`
- `--color-bg` background with a hairline bottom border (`--border-width-hairline` `--color-divider`)
- not sticky
- every link at least `--tap-target-min` tall
- no horizontal scroll at 360 px

**From `64rem` (sidebar):**
- a column of the same three items: the logo at the top, then "+ Tạo", then "Lịch sử"
- width `var(--sidebar-width)`
- `position: sticky; top: 0; height: 100dvh; overflow-y: auto`
- padding `var(--space-6) var(--space-4)`, gap `var(--space-4)`
- a hairline right border instead of the bottom border
- In this layout "+ Tạo" is a full-width pill.
- Leave the rest of the column empty. Do not add placeholders for 7-2.

The links keep the existing visible focus style (`:focus-visible`).

### N2 — `AppShell` and routes
- **`AppShell`** renders `<div className={styles.shell}><AppNav /><Outlet /></div>`.
- **Below `64rem`:** `.shell` is a grid with rows `auto minmax(0, 1fr)` and one column `minmax(0, 1fr)`.
- **From `64rem`:** columns `var(--sidebar-width) minmax(0, 1fr)`, one row, with the nav in the first column.
- **`App.tsx`:**
  - Nest every route currently inside `SessionLayout` inside `<Route element={<AppShell />}>`, which sits inside the `SessionLayout` route. That covers `/`, `/history`, `/decisions/*`, `/presets/*` and the `*` NotFound.
  - `/s/:id` stays first and outside both.
- `AppShell` makes **no** requests and does not call `ensureSession`.

### N3 — `Screen`
**API:**
```tsx
type ScreenProps = {
  backTo?: To;                  // renders <BackLink to={backTo}>{t('back')}</BackLink>
  width?: 'narrow' | 'wide';    // default 'narrow'; 'wide' widens the column from 48rem
  align?: 'start' | 'center';   // default 'start'; 'center' centres the content vertically
  focus?: boolean;              // N4
  className?: string;           // added to the content column (for page gap overrides)
  children: ReactNode;
};
```
`To` comes from `react-router`.

**Markup:**
```html
<main class="screen" data-focus?>
  <div class="top"><BackLink/></div>
  <div class="content">children</div>
</main>
```
- The `.top` row is rendered only when `backTo` is set.

**CSS:**
- **`.screen`:**
  - `display: grid; grid-template-rows: auto minmax(0, 1fr); align-content: start`
  - `padding: var(--space-6) var(--space-4) var(--space-8)`
  - `background: var(--color-bg)`
  - With `align="center"`, the content row is centred (`align-self: center` on `.content`), but the back link stays at the top.
- **`.top`:** `width: min(100%, var(--content-wide-max-width)); margin: 0 auto var(--space-5)`.
  - The back link therefore sits at the **same position on every screen**: the left edge of the wide column, at the top, whatever the content width.
- **`.content`:**
  - `display: grid; gap: var(--space-6); width: min(100%, var(--content-max-width)); margin: 0 auto; min-width: 0`
  - From `48rem` with `width="wide"`: `width: min(100%, var(--content-wide-max-width))`.
- **From `48rem`:** padding `var(--space-6)`, the value all screens use today.
- `.screen` has **no** `min-height`. It fills its parent because of the next rule.

**`global.css`:** add `#root { display: grid; grid-template-columns: minmax(0, 1fr); min-height: 100dvh; }`.
- The shell and the public page then stretch to the viewport, and the shell's top bar does not push a `100dvh` screen into a scrollbar.
- Check that `/design` still renders full-width with no horizontal scroll.

**`--sidebar-width: 16rem`** goes in `tokens.css`, next to the content widths.

`BackLink` keeps its own styles. Remove `justify-self: start` from `BackLink.module.css` only if it becomes unnecessary; it is harmless.

### N4 — Focus mode
- **`CaseOpening`** renders `<Screen focus …>`, which sets `data-focus` on `<main>`.
- **`AppShell.module.css`:** while the shell contains a focused screen, hide the nav and drop its column:
  ```css
  .shell:has([data-focus]) { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); }
  .shell:has([data-focus]) > nav { display: none; }
  ```
  Adapt the selector to the class names you use. This applies at **every** width (D-032). It covers all three pages that render `CaseOpening`, including the builder's `?view=case`, with no route checks. `global.css` already relies on `:has()` for the open dialog.
- Do not add a context, an effect or route matching for this.

### N5 — Screens
Each screen below renders `Screen` instead of its own `<main>` + content `<div>`:
- Delete its `.screen` rule and the `.content` layout properties (display, width, margin).
- Delete the `48rem` padding/width overrides that `Screen` now owns.
- Keep page-specific rules, such as Home's two-column `presetList` from `48rem` and Preview's two-column option list.
- Keep a page's own gap through `className` only where it differs from `--space-6`.

| Screen | `width` | `align` | `backTo` | Notes |
|---|---|---|---|---|
| `HomePage` | wide | start | — | gap `--space-7` |
| `HistoryPage` | narrow | start | `/` | gap `--space-5` |
| `DecisionForm` | narrow | start | unchanged expression | Keep the `<form>`, now inside `Screen`. It keeps its grid gap and sticky action bar. |
| `DecisionPreview` | wide | start | `backTo` prop | |
| `DecisionLoadState` | narrow | center | — | `justify-items: center; text-align: center` stay |
| `NotFoundPage` | narrow | center | — | keeps its "Về trang chủ" link |
| `CaseOpening` | wide | center | `backTo` prop | `focus`. Keep `justify-items: center` and the narrow `.result`/`.actions`. Keep `ShareDialog` inside the `<main>`. |
| `SharedCasePage` (all three states) | wide (content), narrow (loading/error) | center (loading/error), start (content) | — | outside the shell, no nav |

- The `<title>` elements stay where they are.
- Do not change any `backTo` value.

### i18n
- `navLabel: 'Điều hướng chính'`
- `navCreate: 'Tạo'`

## Allowed dependencies
None.

## Acceptance criteria
- [ ] **360 px and 768 px:**
  - Home, History, a preview, the builder and NotFound show the top bar (logo, "Lịch sử", "+ Tạo") with no horizontal scroll.
  - Short screens have no vertical scrollbar.
- [ ] **1024 px and 1280 px:**
  - The same screens show the sidebar on the left; the content is centred in the remaining area.
  - The sidebar stays in place while the page scrolls.
- [ ] **Active link:** on `/history`, "Lịch sử" has `aria-current="page"` and the active style.
- [ ] **Back link position:**
  - On History, a preview, the builder and a case screen, "← Trở về" is at the same top-left position at each width.
  - On the case screen it no longer moves with the centred content.
- [ ] **Focus mode:** `/presets/<slug>/open`, `/decisions/<id>/open` and the builder's `?view=case` show **no** top bar and **no** sidebar at 360 and 1280 px; the stage uses the full width.
- [ ] **Public page:** `/s/<id>` has no nav, still makes only `GET /api/public/shares/:id` and sets no cookie.
- [ ] **`/design`:** still renders full-width.
- [ ] **No behaviour change:** spins, "Đi thôi", "Chia sẻ" (dialog, `Esc`, focus return), revoke and the builder save behave as before.
- [ ] `git grep -n "min-height: 100dvh" -- apps/web/src` shows only `global.css`.
- [ ] `git grep -nE "^\.screen" -- apps/web/src ':!apps/web/src/app/Screen.module.css'` is empty.
- [ ] `git grep -n "ensureSession" -- apps/web/src ':!*/lib/api/*'` shows only `SessionLayout.tsx`.
- [ ] `make check` passes: domain 48, api 41. Lockfile unchanged.

## Validation
```bash
make check
git grep -n "min-height: 100dvh" -- apps/web/src
git grep -nE "^\.screen" -- apps/web/src ':!apps/web/src/app/Screen.module.css'
git grep -n "ensureSession" -- apps/web/src ':!*/lib/api/*'
git diff --name-only main... -- apps/web/src | grep -v "pages/design" | grep "\.css$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" --
git diff --stat main...
```
- The literal grep must be empty. `rem` breakpoints in media queries are allowed.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `feat/7-1-navigation-shell` from `feat/phase-7-responsive`.
- Suggested commits:
  1. `feat(web): add the navigation shell`
  2. `refactor(web): use the shared screen layout`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check:
   - the top bar on a phone
   - the sidebar on desktop
   - the back link position across screens
   - the case screen with no navigation (focus mode)
