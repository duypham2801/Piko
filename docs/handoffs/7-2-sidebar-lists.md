# HANDOFF 7-2 — Sidebar lists and desktop Home

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 7 decisions are in **D-032** in `docs/DECISIONS.md`; read it first.

7-1 added the navigation shell:
- **`app/AppNav.tsx`:**
  - one `<nav>`, shown as a top bar below `64rem` and as a sticky sidebar from `64rem`
  - it holds the logo with the tagline, "Lịch sử" and "+ Tạo"
- **`app/AppShell.tsx`:** the layout route.
- **`app/Screen.tsx`:** the screen layout.
- **Focus mode:** case screens hide the nav with a CSS `:has([data-focus])` rule.

D-032 also puts "Của bạn" (saved decisions) and "Gần đây" (newest history) **in the sidebar on desktop**. Home on desktop then drops those two sections. Today Home shows both at every width:
- **"Của bạn":** the "Tạo quyết định" create card + saved decision cards, from `useDecisionList()`.
- **"Gần đây":** `HistoryList` with `useHistoryList(5)` and a "Xem tất cả" link, hidden when empty.

**About the two hooks** (`features/decisions/useDecisionList.ts`, `features/history/useHistoryList.ts`):
- Both fetch once on mount.
- The sidebar stays mounted across pages, so it needs a way to reload them.
- D-032 says: reload when the route changes, with no global store.

## Scope
- L1: a small `useMediaQuery` hook and one desktop query constant.
- L2: a reload key on the two list hooks.
- L3: sidebar lists ("Của bạn", "Gần đây") from `64rem` only.
- L4: Home from `64rem`: no "Của bạn" or "Gần đây" sections, and no list requests.

## Out of scope (do NOT do)
- The mobile/tablet top bar (it stays as it is), focus mode, `Screen`, routes and back links.
- Per-screen responsive tuning (7-3).
- Any API, domain or dependency change, and any new request type.
- A global store, context, event bus or cache for the lists.
- Changing `HistoryList`'s look on `/history` and on mobile Home.

## Files to create / modify
**Create:**
- `apps/web/src/lib/useMediaQuery.ts`: `useMediaQuery(query)` + `DESKTOP_QUERY`
- `apps/web/src/app/NavLists.tsx` + `NavLists.module.css`: the sidebar lists

**Modify:**
- `apps/web/src/app/AppNav.tsx` + `.module.css`: render `NavLists` on desktop
- `apps/web/src/features/decisions/useDecisionList.ts`: reload key
- `apps/web/src/features/history/useHistoryList.ts`: reload key
- `apps/web/src/features/history/HistoryList.tsx`: export `historyEntryHref`
- `apps/web/src/features/home/HomePage.tsx` + `.module.css`: desktop Home
- `apps/web/src/i18n/vi.ts`: one key

## Requirements

### L1 — `useMediaQuery`
```ts
export const DESKTOP_QUERY = '(min-width: 64rem)'; // same breakpoint as the sidebar CSS
export function useMediaQuery(query: string): boolean
```
- Implement it with `useSyncExternalStore`:
  - **subscribe:** `matchMedia(query).addEventListener('change', …)`
  - **snapshot:** `matchMedia(query).matches`
- No `useEffect` + `useState` pair, no resize listener.
- It updates live when the window crosses `64rem`.

### L2 — Reload key
- `useDecisionList(reloadKey?: string)` and `useHistoryList(limit?: number, reloadKey?: string)` add `reloadKey` to the fetch effect's dependencies. Nothing else changes.
- Existing callers (Home, `/history`, `ExistingOptionsPanel`) pass no key, so their behaviour is unchanged.
- **Keep the current data while reloading.** Do not reset the state to `loading` when the key changes, so the sidebar does not flash empty on every navigation.
  - The effect already only sets state when a response arrives. Keep it that way.
  - `useHistoryList`'s `retry` still resets to `loading`, as now.

### L3 — Sidebar lists
**Mounting:**
- `AppNav` calls `useMediaQuery(DESKTOP_QUERY)`.
- When it is `true`, render `<NavLists />` after the links.
- Below `64rem` it is **not rendered**, so the top bar makes no list requests.

**`NavLists`:**
- It reads `useLocation().pathname` and passes it as the reload key: `useDecisionList(pathname)` and `useHistoryList(5, pathname)`.
- So a save, delete, edit or "Đi thôi" shows up on the next page change.
- Search-param changes (the preview's `?off=` switches) must **not** reload.

**Section "Của bạn"** (`<section>` with an `<h2>` `t('yourDecisions')`):
- **Loaded with decisions:** a `<ul>` of `NavLink`s to `/decisions/:id`, passing `state={{ record }}` like Home does.
  - Each row shows the first option emoji found (if any, `aria-hidden`) and the decision title.
- **Loaded with none:** a muted line `t('noDecisionsYet')` ("Chưa có quyết định nào.").
- **Error:** a muted line `t('listFailed')`.
- **Loading (first load only):** render nothing under the heading. No "Đang tải" text.

**Section "Gần đây"** (`<section>`, header with an `<h2>` `t('recent')` and a `Link` `t('seeAll')` to `/history`):
- **Shown when** loaded with entries, or on error. Hidden when empty or on the first load, like Home today.
- **Loaded:** a `<ul>` of rows, one per entry:
  - the winner emoji (if any, `aria-hidden`)
  - the winner label, and under it the decision title, muted and smaller
- **Rows link** to `historyEntryHref(entry)` (export it from `HistoryList.tsx` and reuse it). Entries without a link render as a plain, non-interactive row.
- **No time** in the sidebar.
- **Error:** a muted line `t('historyLoadFailed')`.

**Layout and style** (`NavLists.module.css`, tokens only):
- **Sections:**
  - `NavLists` fills the rest of the sidebar column.
  - "Của bạn" takes the free height and scrolls on its own: `flex: 1 1 auto; min-height: 0; overflow-y: auto`.
  - "Gần đây" sits below it at its natural height.
  - The sidebar's own `overflow-y: auto` stays as a fallback for very short windows.
- **Headings:** `<h2>` styled small: `--text-sm`, bold, `--color-text-muted`, with `--space-2` below. Same style in both sections. "Xem tất cả" uses `--text-sm` and `--color-text-accent`.
- **Rows:**
  - at least `--tap-target-min` tall
  - padding `var(--space-2) var(--space-3)`, `--radius-md`
  - `--color-text`, `--text-sm`, no underline
  - one line, with the label truncated by ellipsis (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap` on the text span)
  - the emoji does not shrink
  - In "Gần đây" the label and the title are two truncated lines.
- **Row states:**
  - hover (inside `@media (hover: hover)`): `--color-surface` background
  - `:focus-visible`: the same ring as `HistoryList`'s linked rows
  - the active `NavLink` (`aria-current="page"`): `--color-selection` background and bold
- No dividers, no cards, no new tokens.

### L4 — Desktop Home
`HomePage` calls `useMediaQuery(DESKTOP_QUERY)`.

**Below `64rem`:** Home is unchanged: "Của bạn" (create card + saved cards), "Gần đây", "Chọn nhanh".

**From `64rem`:**
- Home renders the intro, the mode selector, the **create card alone** (the same "+ Tạo quyết định" card, no heading, with the same card width as one preset card) and "Chọn nhanh".
- It renders **no** "Của bạn" heading, no saved cards and no "Gần đây".
- It makes **no** `GET /api/decisions` or `GET /api/history` requests. The sidebar makes them.
- **Requests only where rendered:** the list hooks must run only where their section renders. Move each section into a small component in `HomePage.tsx`:
  - `SavedDecisionsSection` (uses `useDecisionList`)
  - `RecentSection` (uses `useHistoryList(5)`)
  - a `CreateDecisionCard` used by both layouts
- Keep the current markup and classes of each section. Delete any CSS that becomes unused.

### i18n
- `noDecisionsYet: 'Chưa có quyết định nào.'`

## Allowed dependencies
None.

## Acceptance criteria
- [ ] **1280 px, `/`:**
  - The sidebar shows "Của bạn" (saved decisions) and "Gần đây" (5 newest, with "Xem tất cả").
  - Home shows intro, mode, the create card and "Chọn nhanh" only.
  - Not counting StrictMode's dev double-invocation, the page makes one `GET /api/decisions` and one `GET /api/history?limit=5`, both from the sidebar.
- [ ] **360 and 768 px, `/`:**
  - Home is unchanged, with both sections.
  - The top bar has no lists and makes no list requests.
- [ ] **Resize across `64rem`:** the window switches between the two layouts live, with no reload.
- [ ] **Reload on page change:**
  - Create a decision in the builder: after saving, it appears in the sidebar.
  - Delete it from its preview: it disappears after the redirect to `/`.
  - "Đi thôi" on a case, then "Trở về": the new entry is first in "Gần đây".
  - Toggling options on a preview (`?off=`) makes no list request.
- [ ] **The sidebar never flashes empty** while reloading.
- [ ] **Active row:** on `/decisions/<id>` that row has `aria-current="page"` and the active style.
- [ ] **Long titles** are truncated with an ellipsis. No horizontal scroll in the sidebar.
- [ ] **Overflow:** with about 20 saved decisions at 1280×800, "Của bạn" scrolls on its own and "Gần đây" stays visible.
- [ ] **Errors:** with the api stopped, the sidebar shows the two error lines and the page still works.
- [ ] **No regressions:** `/history`, `ExistingOptionsPanel` ("Thêm từ có sẵn") and focus mode behave as before.
- [ ] `make check` passes: domain 48, api 41. Lockfile unchanged.

## Validation
```bash
make check
git grep -n "useDecisionList\|useHistoryList\|useMediaQuery" -- apps/web/src
git diff --name-only feat/phase-7-responsive... -- apps/web/src | grep "\.css$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" --
git diff --stat feat/phase-7-responsive...
```
- The literal grep must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `feat/7-2-sidebar-lists` from `feat/phase-7-responsive`.
- Suggested commits:
  1. `feat(web): add media query hook and list reload keys`
  2. `feat(web): show saved decisions and recent picks in the sidebar`
  3. `feat(web): slim down Home on desktop`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check:
   - the sidebar lists on desktop (scrolling, long titles, the active row)
   - Home on desktop and on a phone
   - a new decision or "Đi thôi" showing up in the sidebar
