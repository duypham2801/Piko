# HANDOFF 6-3 — History UI: Home "Gần đây" and `/history`

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decision **D-030** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 6 adds result actions, history and sharing (D-030).

**What exists:**
- **6-1** added `GET /api/history?limit=N`.
  - It requires a session.
  - `limit` is an integer from 1 to 200. It defaults to 200. Anything else is `400 invalid_query`.
  - It returns a `HistoryListResponse` (`packages/domain/src/api/history.ts`): `{ entries: HistoryEntry[] }`, newest first. Each entry is `{ id, source, title, winner, createdAt }`.
    - `source` is one of `{ kind: 'decision', decisionId: uuid | null }`, `{ kind: 'preset', slug }`, `{ kind: 'draft' }`. The `decisionId` becomes `null` when the saved decision was deleted.
    - `winner` is a `DecisionOption` (label, optional emoji, …).
    - `createdAt` is an ISO datetime.
- **6-2** added `createHistoryEntry` in `apps/web/src/lib/api/history.ts`. The case screen's "Đi thôi" saves an entry.

**Owner decisions (D-030):**
- Home shows **"Gần đây"** with the **5 newest** entries and a **"Xem tất cả"** link to `/history`.
- `/history` lists every entry.
- Tapping an entry opens its source **when it still exists**:
  - a saved decision with a non-null id → `/decisions/:id`
  - a preset whose slug is known (`findPreset`) → `/presets/:slug`
  - **draft entries, deleted decisions and unknown slugs are not links**
- "Link đã chia sẻ" with revoke also goes in `/history`, but in task 6-5. Do not build it here.

**How Home works today** (`features/home/HomePage.tsx` + `.module.css`), in this order:
1. brand
2. intro
3. mode selector
4. "Của bạn": a create card plus saved decisions, from `useDecisionList` (`features/decisions/useDecisionList.ts`)
5. "Chọn nhanh": preset cards

Since D-028, Home shows no placeholder UI for missing data.

## Scope
- H1: a history list client function and a list hook.
- H2: one shared history list component.
- H3: a "Gần đây" section on Home.
- H4: a `/history` page.
- H5: i18n strings.

## Out of scope (do NOT do)
- Share links, "Link đã chia sẻ", revoke (6-5).
- Deleting history entries, grouping by day, search, filters, pagination or infinite scroll.
- Showing the full option list of an entry, or replaying it.
- Any change to `packages/domain`, `apps/api`, the DB or dependencies.
- Any change to the case screen or to the "Của bạn" / "Chọn nhanh" sections, apart from inserting the new section between them.
- New shared UI primitives in `components/ui/`. Use `Card`, `Button` and `BackLink` as they are.

## Files to create or modify
- `apps/web/src/lib/api/history.ts`: add `listHistory`
- `apps/web/src/features/history/useHistoryList.ts` (new)
- `apps/web/src/features/history/HistoryList.tsx` + `.module.css` (new)
- `apps/web/src/features/history/historyTime.ts` (new): the time formatter
- `apps/web/src/features/history/HistoryPage.tsx` + `.module.css` (new)
- `apps/web/src/features/home/HomePage.tsx` + `.module.css`
- `apps/web/src/app/App.tsx`: the `/history` route
- `apps/web/src/i18n/vi.ts`

## Requirements

### H1 — Client and hook
**`listHistory`** in `lib/api/history.ts`:
```ts
export async function listHistory(
  options?: { limit?: number; signal?: AbortSignal },
): Promise<HistoryEntryData[]>
```
- `await ensureSession()` first, then `withSession(...)` around `apiGet`, with the `HistoryListResponse` schema.
- Add `?limit=<n>` only when a limit is given.
- Return `response.entries`.
- Same pattern as `listDecisions`.

**`useHistoryList(limit?: number)`** in `features/history/`:
- States: `loading | loaded | error`, plus a `retry()`.
- Same shape and abort handling as `useDecisionList`.
- `retry()` sets `loading` and fetches again.
- One fetch per mount, plus one per retry.

### H2 — `HistoryList`
Props: `entries: readonly HistoryEntryData[]`, plus `now: Date` for the time labels. The page creates `now` once per render.

**Markup:**
- A `<ul>`.
- Each entry is an `<li>` containing a **row**.

**Row content:**
- the winner emoji, when present, `aria-hidden`
- the winner label in the display font: this is the main text
- a muted meta line: `{title} · <time dateTime={createdAt}>{label}</time>`

**Links:**
- When the entry has a destination, the whole row is a React Router `<Link>`. The rules are in the Context section.
- When it has none, the row is a plain element with the same layout and no hover, active or cursor styles.
- Put the destination logic in one small function next to the component, e.g. `historyEntryHref(entry): string | undefined`.

**Layout:**
- All rows sit inside **one** `Card` with `tone="surface"`, separated by a divider using `--color-border`.
- Not one card per row: a long list of cards is too heavy.
- Each row is at least `--tap-target-min` tall and has `--space-3`/`--space-4` padding.
- Long labels and titles wrap (`overflow-wrap: anywhere`) and never cause horizontal scroll.
- **Linked rows:**
  - a hover background on `(hover: hover)` devices
  - a visible `:focus-visible` ring with the existing focus-ring token
  - an active state
  - all with existing tokens only
- Reduced motion: no transitions.

**Time label (`historyTime.ts`):**
- A pure function `formatHistoryTime(createdAt: string, now: Date): string`, in the user's local time zone.
  - same calendar day as `now` → `"{t('today')}, HH:mm"`
  - the previous calendar day → `"{t('yesterday')}, HH:mm"`
  - otherwise → `dd/MM/yyyy, HH:mm`
- Use `Intl.DateTimeFormat('vi-VN', …)` for the time and the date. No date library.

### H3 — Home "Gần đây"
- **Position:** a new `<section>` between "Của bạn" and "Chọn nhanh". Its heading level and size match those sections.
- **Data:** it calls `useHistoryList(5)`.
- **Header:**
  - `<h2>` `t('recent')`
  - a **"Xem tất cả"** link (`t('seeAll')`) to `/history`, aligned to the end of the same header row
  - the link is styled as a text link with `--color-text-accent`, like `BackLink`
- **Body:** a `HistoryList` of the entries.
- **States:**
  - **loading:** render nothing
  - **loaded with no entries:** render nothing, so there is no empty placeholder (D-028)
  - **error:** render the heading and a muted line `t('historyLoadFailed')`, the same style as `listFailed`. No retry button on Home.

### H4 — `/history`
- Add the route `/history` in `App.tsx`. The element is `HistoryPage`.
- **Page layout:**
  - follow the existing screens: a centred column with `--content-max-width`, `--space-*` padding and `--color-bg`
  - `BackLink` to `/` with `t('back')`
  - `<h1>` `t('historyTitle')`
  - the document `<title>` is `"{historyTitle} · {title}"`, like the other pages
- **States:**
  - **loading:** `t('loading')`
  - **error:** `t('historyLoadFailed')` and a `Button` with `t('retry')` that calls `retry()`
  - **loaded with no entries:** `t('historyEmpty')`, plus a primary `Button`-styled link back to `/` with the existing `t('backHome')` ("Về trang chủ"). Use a `Link` with the button look, or a `Button` that navigates; pick whichever existing pattern the codebase already uses, and do not add a new primitive.
  - **loaded:** a `HistoryList` of every entry. Use no limit, so the server default of 200 applies.

### H5 — i18n (`vi.ts`)

| Key | Text |
|---|---|
| `recent` | `Gần đây` |
| `seeAll` | `Xem tất cả` |
| `historyTitle` | `Lịch sử` |
| `historyEmpty` | `Chưa có gì ở đây. Mở một case rồi bấm "Đi thôi" để lưu lại.` |
| `historyLoadFailed` | `Chưa tải được lịch sử.` |
| `today` | `Hôm nay` |
| `yesterday` | `Hôm qua` |

## Acceptance criteria
- [ ] **Home** (390 px and 1280 px):
  - a new guest with no history sees no "Gần đây" section
  - after one "Đi thôi" (e.g. on `/presets/food/open`) and going back to Home, "Gần đây" shows that entry: winner, title, "Hôm nay, HH:mm"
  - at most 5 rows
  - "Xem tất cả" opens `/history`
- [ ] **`/history`:**
  - lists every entry, newest first
  - **destinations:**
    - a preset entry opens `/presets/<slug>`
    - a saved-decision entry opens `/decisions/<id>`
    - after deleting that decision, its entry is no longer a link
    - a builder-draft entry is not a link
  - **states:**
    - empty: the empty message and the home link
    - with the api stopped (`docker compose -f compose.dev.yaml stop api`): the error and a working "Thử lại" after restarting the api
- [ ] **Keyboard:**
  - `Tab` reaches only the linked rows and the visible buttons and links
  - linked rows show a focus ring
- [ ] No horizontal scroll at 360 px with a long title or label.
- [ ] The network tab shows one `GET /api/history?limit=5` on Home and one `GET /api/history` on `/history`. Every history request follows the single `/api/me` bootstrap.
- [ ] `make check` passes: domain 48, api 27. No new dependency; lockfile unchanged.

## Validation
```bash
make check
git diff --name-only feat/phase-6-result-history...HEAD -- apps/web/src | grep -v "\.ts$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px|style=" --
git diff --stat feat/phase-6-result-history...HEAD
```
- The literal grep checks only the changed `.tsx`/`.css` files and must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.
- To check "Hôm qua" and older dates without waiting, you may temporarily update `created_at` in the dev DB (`decision_sessions`). Restore or delete those rows afterwards. Do not print secrets from `.env.dev`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md). The web app has no test runner; do not add one.

## Git
- Branch `feat/6-3-history-ui` from `feat/phase-6-result-history`.
- Make exactly two commits:
  - `feat(web): add history list client and hook`, for H1
  - `feat(web): show recent history on Home and a history page`, for H2–H5
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including:
   - the requests seen on Home and `/history`
   - the destination of each source kind
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check, on a phone width and on desktop:
   - Home "Gần đây" after a few "Đi thôi"
   - "Xem tất cả" → `/history`
   - tapping a preset entry and a saved-decision entry
   - the empty and error states
