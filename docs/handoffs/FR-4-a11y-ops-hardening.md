# HANDOFF FR-4 — Accessibility fixes and ops hardening

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

This is the last task from the final engineering review (`docs/FINAL_ENGINEERING_REVIEW.md`, items **X1** and **O2**, plus the LOW items on headings and hints). FR-1 … FR-3 are merged into the integration branch `feat/final-review`. After FR-4 the branch is merged into `main` and Phase 9 (first prod release) starts.

### Accessibility gaps (web)

1. **No skip link.**
   - `app/AppShell.tsx` renders `<AppNav />` and then the route.
   - Every route renders `<main>` through `app/Screen.tsx`.
   - On desktop the sidebar (mode bar, links, "Sổ tay", "Gần đây") comes before `<main>` in tab order.
2. **Focus loss on `/s/:id`** (`features/share/SharedCasePage.tsx`). "Xem lại lượt quay" and "Tự quay thử" are `disabled` while spinning, so the focused button loses focus to `<body>`.
3. **Focus loss after "Tạo link"** (`features/share/ShareDialog.tsx`). When the share is created, the create button is replaced by the link field and the "Gửi link"/"Sao chép link" button, so focus drops to `<body>` inside the sheet.
4. **Focus loss on "Xóa"** (`features/decisions/DecisionPreviewPage.tsx`). The confirm "Xóa" button is `disabled` while deleting.
   - On success the page navigates away, which is fine.
   - On failure the button is re-enabled, but focus is already lost.
5. **Live regions mounted together with their content.**
   - A `role="status"` / `aria-live="polite"` element that is inserted already holding its text is often not announced.
   - **Offenders:**
     - `ShareDialog.tsx`: the create error (`role="status"`, conditional) and the copy status (conditional).
     - `components/ui/Toast.tsx`: rendered conditionally by `features/preview/ResultCard.tsx`, already holding its message.
   - **`features/builder/DecisionForm.tsx`, action bar status `<p>`:** it swaps `role` and `aria-live` between `status`/`polite` and `alert`/`assertive` on the same element. Role swaps are unreliable.
6. **Load states without a page title or `<h1>`.**
   - `features/decisions/DecisionLoadState.tsx`, loading and error. It is used by the decision preview and the builder edit page, and the previous route's `<title>` stays.
   - `SharedCasePage.tsx` `LoadingPage` / `ErrorPage`: no `<h1>`.
7. **EmojiPicker focus** (`features/builder/EmojiPicker.tsx`, opened from `OptionRow.tsx`). Focus stays on the trigger when the panel opens. Escape and choosing already return focus to the trigger (`OptionRow.tsx` line ~42).
8. **Accessible names without spaces.** Sibling `<span>`s inside one link, button or live region produce names such as "Bún bò HuếĂn gì?". Known places:
   - `features/case-opening/WinnerPanel.tsx`: label + name
   - `app/NavLists.tsx`: "Gần đây" rows (winner + title) and "Sổ tay" rows
   - `features/history/HistoryList.tsx`: rows
9. **Heading order.** On desktop the sidebar `<h2>`s ("Sổ tay", "Gần đây" in `NavLists.tsx`) come before the page `<h1>`.
10. **The min-options hint is not linked.** In `features/preview/DecisionPreview.tsx`, when only the minimum number of options is left, the hint `minOptionsHint` appears and the checked switches are disabled. The switches do not reference the hint. `CaseOpening.tsx` already does this right for "Không phải hôm nay" (`aria-describedby={lastTwoOptionsHintId}`); follow that pattern.

### Ops gaps (api)

11. **IPv6 rate limit.**
    - Guest creation is limited per client IP (`FixedWindowRateLimiter` in `apps/api/src/auth/rate-limit.ts`, keyed by `clientIp()` in `auth/session.middleware.ts`).
    - An IPv6 host usually controls a whole `/64`, so keying on the full address makes the limit useless for IPv6.
12. **No data pruning.**
    - Expired sessions, guests nobody can reach any more, and expired share links stay in the database forever.
    - Expired shares are only deleted for one user when that user creates a new share (`shares.service.ts` `createShare`).

## Scope
- Items 1–12 as specified below.

## Out of scope (do NOT do)
- `docs/**`: the architect updates the runbook (scheduled and off-site backups, `APP_ORIGIN` = `SITE_ADDRESS`).
- **Schema changes or migrations.** No new index or column.
- Compose, Caddy or Makefile changes.
- New dependencies.
- **Visual redesigns.** The only visible changes allowed are the skip link (visible on focus only) and the new load-state headings.
- `packages/domain`.

## Files to create / modify (expected)
- **Web:**
  - `apps/web/src/app/AppShell.tsx` (+ `AppShell.module.css`), `app/Screen.tsx`: item 1
  - `features/share/SharedCasePage.tsx` (+ CSS module if needed): items 2, 6
  - `features/share/ShareDialog.tsx`: items 3, 5
  - `features/decisions/DecisionPreviewPage.tsx`: item 4
  - `components/ui/Toast.tsx`, `features/preview/ResultCard.tsx`: item 5
  - `features/builder/DecisionForm.tsx` (+ CSS module): item 5
  - `features/decisions/DecisionLoadState.tsx`: item 6
  - `features/builder/EmojiPicker.tsx`: item 7
  - `WinnerPanel.tsx`, `app/NavLists.tsx`, `features/history/HistoryList.tsx`: item 8
  - `app/NavLists.tsx` (+ CSS module): item 9
  - `features/preview/DecisionPreview.tsx`: item 10
  - `apps/web/src/i18n/vi.ts`: new strings
- **API:**
  - `apps/api/src/auth/rate-limit.ts`, `rate-limit.test.ts`, `auth/session.middleware.ts`: item 11
  - `apps/api/src/services/maintenance.service.ts` (new), `maintenance.service.test.ts` (new), `apps/api/src/index.ts`: item 12

## Requirements

### 1 — Skip link
- **`AppShell` renders a skip link as its first child,** before `<AppNav />`: `<a class="skip-link" href="#main">` with the text `t('skipToContent')` = **"Bỏ qua đến nội dung chính"**.
- **Hidden until focused.** When focused, it shows at the top left above everything:
  - `z-index`: the existing toast/overlay layer tokens; pick the right one, do not invent a number
  - surface background, border, `--radius-pill`, `--space-*` padding
  - the focus ring token
- **`Screen`'s `<main>` gets `id="main"` and `tabIndex={-1}`,** so activating the link moves focus there. No visible outline on `<main>` when it is focused this way: use `:focus:not(:focus-visible)` or an equivalent, but keep tokens.
- Only one `<main>` per page exists today. Keep it that way.

### 2 — `/s/:id` keeps focus during a spin
- **Mirror `CaseOpening`:**
  - When the state becomes `spinning`, move focus to the page `<h1>` (give it `tabIndex={-1}`, `focus({ preventScroll: true })`).
  - When it becomes `revealed`, move focus back to the button that started the spin ("Xem lại lượt quay" or "Tự quay thử").
- **Remember which button started the spin.** The existing `revealLabel` state already tells you.
- Keep the buttons disabled while spinning.

### 3 — Focus after "Tạo link"
- After a successful create, focus the **"Gửi link" / "Sao chép link" button** (the primary next action), not the link field. Wait one frame after the re-render.
- On a create error, focus stays on the create button. It is not disabled after the request ends; check that this holds.

### 4 — Focus after a failed delete
- On a delete failure, focus the confirm "Xóa" button again once it is re-enabled (after the re-render).
- Leave success and 404 behaviour unchanged.

### 5 — Live regions are mounted before their content
- **Rule:** a polite status region must be in the DOM, empty, before its text appears.
  - `role="alert"` may be inserted with its content.
  - Do not swap `role` or `aria-live` on an existing element.
- **`ShareDialog`:**
  - One always-mounted `role="status"` element in each branch (before and after creation) whose text changes: create error/limit, copied, copy failed.
  - Keep the current classes and styling of the visible messages.
  - An empty region must not add visible space. Collapse it when empty (`:empty`), as `DecisionForm` already does.
- **`Toast` / `ResultCard`:**
  - `ResultCard` keeps one always-mounted, visually-hidden-when-empty `role="status"` wrapper while the card is shown.
  - Toast's visible pill renders **inside** it and is still conditional.
  - `Toast` itself drops `role="status"`, so there are no nested live regions.
  - The toast's look, position and 3 s timing are unchanged.
- **`DecisionForm` action bar:**
  - Replace the role-swapping `<p>` with two always-mounted elements:
    - `role="status"` for progress and success ("Đang lưu…", "Đã lưu", …)
    - `role="alert"` for errors (validation summary, limit error, save error)
  - Exactly one of them has text at a time.
  - The visible result (colour, size, position, min-height reservation) must stay identical.

### 6 — Load states have a title and a heading
- **`DecisionLoadState`:**
  - **Loading:** render `<title>` "Đang tải… · PIKO" and a **visually hidden** `<h1>` "Đang tải…", plus the existing `LoadingText`.
  - **Error:** render `<title>` "Không tải được · PIKO" and a **visible** `<h1>`. The existing error sentence becomes that heading, or a short heading goes above it; pick the one that keeps the current look closest and say which in the report.
  - Use i18n keys. Reuse existing strings where they already say this. Do not duplicate them.
- **`SharedCasePage` `LoadingPage` / `ErrorPage`:** the same pattern. The page `<title>` already exists in the parent; keep it.
- **The not-found state already renders `NotFoundPage`** (title + h1). Do not change it.

### 7 — EmojiPicker moves focus in
- When the panel opens, focus the currently selected emoji button, or "Không emoji" when none is selected.
- Escape and choosing keep returning focus to the trigger as today.
- Tab order inside the panel stays native. No roving tabindex.

### 8 — Spaces in accessible names
- Add a real separator text node between sibling text `<span>`s that end up in one accessible name: `{' '}`, or a visually hidden `", "` where a space would read badly.
- **Places:**
  - WinnerPanel: label then name
  - NavLists "Gần đây" rows: winner, then title
  - NavLists "Sổ tay" rows: check whether they need it
  - HistoryList rows
- **Check every other row/link that combines spans** with `git grep -n "<span className" -- apps/web/src` and fix the same pattern where it applies. List what you changed.
- No visual change: the spans are already block/flex items, so the added space must not shift the layout. Verify.

### 9 — Sidebar headings do not precede the `<h1>`
- In `NavLists`, the section titles "Sổ tay" and "Gần đây" stop being `<h2>`.
- Each section becomes a `<section aria-labelledby="…">`, and the title becomes a `<p id="…">` (or `<span>`) with the **same styling**.
- The lists keep their current markup and behaviour (current-row scroll, retry, hidden while empty).

### 10 — The min-options hint is linked
- In `DecisionPreview`, give the hint a stable id. Every switch disabled because of the minimum gets `aria-describedby` pointing at it, only while it is disabled.
- `Switch` already spreads extra props onto the `<button>`; use that.

### 11 — IPv6 rate-limit key
- **Add and export a pure function `rateLimitKey(ip: string): string`** in `auth/rate-limit.ts`:
  - **IPv4** (`a.b.c.d`): return it unchanged.
  - **IPv4-mapped IPv6** (`::ffff:a.b.c.d`, any case): return the IPv4 part.
  - **IPv6:** return the `/64` prefix in canonical, lower-case, fully expanded form, for example `2001:0db8:0000:0001::/64`.
    - Expand `::` correctly, including at the start, the end and in the middle.
    - Drop a zone id (`%eth0`) first.
  - **Anything else** (`unknown`, malformed): return it unchanged. Do not throw.
- **`session.middleware.ts`** calls `options.limiter.consume(rateLimitKey(clientIp(...)))`. `clientIp` itself is unchanged.
- **Unit tests in `rate-limit.test.ts`:**
  - IPv4 unchanged
  - mapped IPv4
  - two addresses in the same `/64` give the same key; different `/64`s give different keys
  - `::1`
  - a leading `::` (`::abcd`)
  - a zone id
  - garbage input unchanged

### 12 — Pruning
- **New `services/maintenance.service.ts`** exports `pruneExpiredData(db, now = new Date())`. It returns `{ sessions: number; guests: number; shares: number }` (deleted row counts). It runs these deletes in one transaction, in this order:
  1. **Expired sessions:** `sessions.expires_at <= now`.
  2. **Unreachable guests:** `users.kind = 'guest'` with **no remaining session**. Nobody can ever sign in as them again. Their decisions, history and shares go with them through the existing `ON DELETE CASCADE`.
  3. **Abandoned empty guests:** `users.kind = 'guest'`, `last_seen_at <= now − GUEST_ABANDON_AFTER_MS` (30 days, an exported constant), and **no** decisions, history entries or shares. Their sessions cascade.
     - Such a visitor, if they come back, simply gets a new guest through the normal bootstrap. They lose nothing because they had nothing.
  4. **Expired shares:** `shared_cases.expires_at IS NOT NULL AND expires_at <= now`. Shares without expiry are kept.
- **`registered` users are never deleted** by any rule. That kind is not created yet, but the rule must hold.
- Use Drizzle query builders (`notExists`, `lte`, …). Raw `sql` only where the builder cannot express it, with parameters, never string interpolation.
- **Tests (`maintenance.service.test.ts`, PGlite, follow the style of `shares.service.test.ts`), each rule plus its negative:**
  - an expired session is deleted, a valid one is kept
  - a guest left with no session is deleted together with their decisions
  - a guest with a valid session but data, and older than 30 days, is kept
  - an empty guest older than 30 days is deleted; an empty guest seen 29 days ago is kept
  - an expired share is deleted; a future-expiry share and a no-expiry share are kept
  - a `registered` user with no session is kept (insert the row directly)
  - the returned counts match
- **Schedule (`apps/api/src/index.ts`):**
  - After the server starts listening, run `pruneExpiredData` once, then every **6 hours** (exported constant `PRUNE_INTERVAL_MS`) with `setInterval(...).unref()`.
  - Log one line with the three counts after each run, and only when any count is > 0.
  - A failure logs the error message (no stack, no data) and keeps the server running. The next interval tries again.
  - Clear the interval in the existing `shutdown`.
  - Runs in every `NODE_ENV` except `test`. `index.ts` is not used by tests, but guard anyway.

## Allowed dependencies
- None.

## Acceptance criteria
- [ ] **1:**
  - On `/`, desktop and phone, the first Tab shows "Bỏ qua đến nội dung chính".
  - Enter moves focus to `<main>`, and the next Tab reaches the first control in the page content, not the sidebar.
- [ ] **2:** on `/s/:id`, the active element is the `<h1>` while spinning and the starting button after the reveal, for both buttons. Report `document.activeElement` at each step.
- [ ] **3:** after "Tạo link", the active element is the send/copy button.
- [ ] **4:** with `DELETE /api/decisions/*` failing (devtools request blocking), the active element after the failure is "Xóa", and the alert is shown.
- [ ] **5:**
  - `git grep -n "role={" -- apps/web/src` shows no role that depends on state.
  - The status regions listed above exist in the DOM before their text appears; report how you checked.
  - The toast and the DecisionForm status look the same as before (screenshots before/after at 375 and 1280 px).
- [ ] **6:** while a decision loads (throttle the network), `document.title` is "Đang tải… · PIKO" and an `<h1>` exists. In the error state the title and a visible `<h1>` exist. The same holds for `/s/:id`.
- [ ] **7:** opening the emoji panel focuses the selected emoji (or "Không emoji"). Escape returns focus to the trigger.
- [ ] **8:** report the accessible names (DevTools Accessibility pane, or `computedName` via CDP) of a WinnerPanel, a "Gần đây" row and a History row. Each has a space between its parts.
- [ ] **9:** on desktop `/decisions/:id`, the first heading in DOM order is the page `<h1>`.
- [ ] **10:** with only the minimum options left, a disabled switch's description is the hint text.
- [ ] **11, 12:** the new tests pass. api tests total **52 + the new ones**; report the number.
- [ ] **12:** on the dev stack, the first api start logs either nothing (nothing to prune) or one count line, and the api stays healthy.
- [ ] No horizontal overflow at 360, 768, 1280 and 1920 px on `/`, a preview page, the builder, `/history` and `/s/:id`.
- [ ] `make check` passes with 0 lint warnings: domain 48, api ≥ 60. Lockfile unchanged. No raw colour, duration or shadow literals.

## Validation
```bash
make check
git grep -n "role={" -- apps/web/src
git diff --stat feat/final-review...
```
- After switching branches, run `docker compose -f compose.dev.yaml restart web api`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md). The new api tests are service and pure-function tests, which the policy allows.

## Git
- Branch `feat/FR-4-a11y-ops` from `feat/final-review`.
- Commits (suggested):
  - `fix(web): skip link and main focus target`
  - `fix(web): keep focus on share, delete and replay`
  - `fix(web): persistent live regions`
  - `fix(web): titles and headings for load states`
  - `fix(web): emoji picker focus, accessible name spacing, sidebar headings, min-options hint`
  - `fix(api): key the guest rate limit on the IPv6 /64`
  - `feat(api): prune expired sessions, unreachable guests and expired shares`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts and the lint summary
4. Deviations from this handoff and why
5. Known issues / open questions
6. The evidence asked for in the acceptance criteria:
   - active elements for items 2–4 and 7
   - accessible names for item 8
   - titles for item 6
   - before/after screenshots for item 5
   - the api log line for item 12
7. What the owner should check in the browser:
   - Tab from the top of `/` (skip link)
   - "Tạo link" and "Xem lại lượt quay" with the keyboard
   - the toast and the builder save message still look the same
