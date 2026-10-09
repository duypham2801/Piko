# HANDOFF 6-5b — "Link đã chia sẻ" with revoke in `/history`

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decision **D-030** in `docs/DECISIONS.md`, including its section "Shares API defaults (6-4, architect)". You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 6 adds result actions, history and sharing (D-030).

**What exists:**
- **The shares API (6-4)**, owner routes with a session required:
  - **`GET /api/shares`:**
    - returns a `SharedCaseListResponse` = `{ shares: SharedCase[] }` (`packages/domain/src/api/shares.ts`)
    - contains only **active** links (expired ones are filtered), newest first
    - each `SharedCase` is `{ id, title, category?, options, result | null, spunAt | null, createdAt, expiresAt | null }`, where `expiresAt: null` means no expiry
  - **`DELETE /api/shares/:id`:**
    - revokes a link by deleting it, and returns `204`
    - returns `404 not_found` for an id that is unknown, already revoked, or owned by someone else
    - after a revoke, `/s/:id` shows "Link này không còn khả dụng"
- **6-5a** added:
  - `apps/web/src/lib/api/shares.ts`, with `createShare`, `recordShareSpin` and `fetchPublicShare`
  - the share dialog
  - the public page `/s/:id` (`features/share/SharedCasePage.tsx`), which sits outside `SessionLayout`
- **`/history`** (`features/history/HistoryPage.tsx`) has:
  - a `BackLink` and an `<h1>` "Lịch sử"
  - one `HistoryList`: one `Card` with rows separated by hairline dividers (`--border-width-hairline`, `--color-divider`)
  - loading, error with "Thử lại", and empty states
- **`useHistoryList`** (`features/history/useHistoryList.ts`) is the list-hook pattern to follow.
- **Deleting a saved decision** (`features/decisions/DecisionPreviewPage.tsx`) uses an inline confirm:
  - The "Xóa" action turns into a question with "Hủy" and a red "Xóa" button.
  - Focus moves to "Hủy" when confirming and back to "Xóa" when cancelling.
  - The red button is a hand-styled `<button className={styles.confirmDelete}>`, because `Button` has no danger variant.
- **`Button` variants** (`components/ui/Button.tsx`) are `primary`, `secondary` and `outline`. `/design` shows every variant (`pages/design/ComponentsSection.tsx`).
- **Tokens:**
  - `--color-danger` (red-700) has 6.2:1 contrast on cream.
  - `--color-on-primary` is the white text the current red button uses.

**Owner decision (D-030):** the owner can revoke a link from a "Link đã chia sẻ" list in `/history`.

## Scope
- R1: a `danger` variant on `Button`. The decision delete confirm uses it.
- R2: a list client, a revoke client and a list hook.
- R3: the "Link đã chia sẻ" section in `/history`, with an inline revoke confirm.
- R4: i18n strings.

## Out of scope (do NOT do)
- **New link actions:** copying or re-sharing a link from the list, editing its lifetime, extending it.
- **Other screens:** a "Link đã chia sẻ" section on Home, or a count anywhere else.
- **Other list behaviour:**
  - deleting history entries
  - pagination
  - showing expired links. The API does not return them.
- Live viewing (6-6), the navigation shell (Phase 7).
- `packages/domain`, `apps/api`, the DB, dependencies.
- Any change to `HistoryList` rows or to the history states, apart from the new heading (R3).

## Files to create or modify
- `apps/web/src/components/ui/Button.tsx` + `.module.css`: the `danger` variant
- `apps/web/src/pages/design/ComponentsSection.tsx`: show `danger`
- `apps/web/src/features/decisions/DecisionPreviewPage.tsx` + `.module.css`: use `Button variant="danger"`
- `apps/web/src/lib/api/shares.ts`: `listShares`, `revokeShare`
- `apps/web/src/features/share/useShareList.ts` (new)
- `apps/web/src/features/share/SharedLinkList.tsx` + `.module.css` (new)
- `apps/web/src/features/history/HistoryPage.tsx` + `.module.css`
- `apps/web/src/i18n/vi.ts`

## Requirements

### R1 — `Button variant="danger"`
**`Button`:**
- Add `'danger'` to the `variant` union.
- Style: `background: var(--color-danger)` and `color: var(--color-on-primary)`, at both sizes.
- The border, shadow, pressed state and disabled state are the same as the other variants.

**`DecisionPreviewPage`:**
- The confirm's red button becomes `<Button disabled={deleting} id={deleteButtonId} variant="danger" …>`.
- Delete the `.confirmDelete` rules from its CSS module.
- The look and behaviour are unchanged.

**`/design`:** `ComponentsSection` shows `danger` at `md` and `lg`. The sample label for `danger` is `Xóa`.

### R2 — Client and hook
**`lib/api/shares.ts`:**
```ts
export async function listShares(options?: { signal?: AbortSignal }): Promise<SharedCaseData[]>
export async function revokeShare(id: string): Promise<void>
```
- Both functions call `await ensureSession()`, then wrap the request in `withSession(...)`.
- `listShares` uses `apiGet('/api/shares', SharedCaseListResponse, …)` and returns `response.shares`.
- `revokeShare` uses `apiDelete('/api/shares/<encodeURIComponent(id)>')`.

**`features/share/useShareList.ts`:**
- Same shape and abort handling as `useHistoryList`, with no limit.
- It returns `{ status: 'loading' | 'loaded' | 'error', shares, removeShare(id) }`.
- `removeShare` drops a share from the local list. Do not refetch after a revoke.
- No `retry`. The section has no retry button (see R3).

### R3 — "Link đã chia sẻ" in `/history`

**Page structure, top to bottom:**
1. `BackLink` and `<h1>` `t('historyTitle')`, unchanged.
2. **The shares section,** a `<section>` with an `<h2>` `t('sharedLinks')`:
   - `loading`: render nothing.
   - `loaded` with no shares: render nothing (D-028).
   - `error`: the heading and a muted line `t('sharesLoadFailed')`, the same style as Home's history error.
   - `loaded` with shares: a `SharedLinkList`.
3. **The history section,** a `<section>`:
   - an `<h2>` `t('historyEntries')`
   - then the existing history states and `HistoryList`, unchanged
   - the `<h2>` is always shown, so the page structure does not jump when the shares load

Both `<h2>` use the same size as the section headings on Home.

**Requests:**
- `/history` makes one `GET /api/history` and one `GET /api/shares`, both after the single `/api/me` bootstrap.
- A failure of one request does not affect the other section.

**`SharedLinkList`** takes these props:
```ts
{
  shares: readonly SharedCaseData[];
  now: Date;
  onRevoked: (id: string) => void;
}
```

**Layout:**
- One `Card` (`tone="surface"`), with rows separated by the same hairline divider as `HistoryList`.
- Each row is at least `--tap-target-min` tall, with `--space-3`/`--space-4` padding.
- Text wraps with `overflow-wrap: anywhere`. No horizontal scroll at 360 px.

**Row content:**
- **Main text:** a React Router `<Link to={`/s/${share.id}`}>` with `share.title`, in the display font. It opens the public page.
  - Give the link a visible `:focus-visible` ring with the focus-ring token.
  - Do not make the whole row a link, because the row also has a button.
- **Meta line** (muted, small):
  - When `share.result` exists: the winner's emoji (`aria-hidden`) and label, then ` · `.
  - Then the expiry:
    - `"{t('shareExpires')} {formatHistoryTime(share.expiresAt, now)}"` when `expiresAt` is set
    - `t('shareNoExpiry')` otherwise
  - Wrap the time in `<time dateTime=…>`.
  - Reuse `formatHistoryTime` from `features/history/historyTime.ts`.
- **Action:**
  - A `Button variant="outline"` `t('revoke')`, at the end of the row on wide screens.
  - Under the text when the row is narrow. Use flex-wrap; no media query is needed.

**Inline revoke confirm:**
- At most one row confirms at a time. Tapping "Thu hồi" on another row moves the confirm there.
- **The confirming row shows:**
  - the text `t('revokeConfirm')`
  - an outline `Button` `t('cancel')`
  - a `Button variant="danger"` `t('revoke')`
- **Focus:**
  - Focus moves to "Hủy" when the confirm opens.
  - "Hủy" closes the confirm and returns focus to that row's "Thu hồi".
- **While revoking:**
  - Both buttons are disabled.
  - The danger button shows `t('revoking')`.
  - It calls `revokeShare(id)`.
- **On success, or on `404`** (the link is already gone):
  - call `onRevoked(id)`, so the row disappears
  - move focus to the section `<h2>` (`tabIndex={-1}`) when rows remain, or to the history `<h2>` (`tabIndex={-1}`) when the section disappears
- **On any other error:**
  - show `t('revokeFailed')` under that row with `role="alert"`, in the same style as `deleteFailed`
  - the buttons work again
- Ignore a response that arrives after the page unmounted.

### R4 — i18n (`vi.ts`)

| Key | Text |
|---|---|
| `sharedLinks` | `Link đã chia sẻ` |
| `historyEntries` | `Đã chọn` |
| `sharesLoadFailed` | `Chưa tải được link đã chia sẻ.` |
| `shareExpires` | `Hết hạn` |
| `shareNoExpiry` | `Không hết hạn` |
| `revoke` | `Thu hồi` |
| `revoking` | `Đang thu hồi…` |
| `revokeConfirm` | `Thu hồi link này? Người có link sẽ không xem được nữa.` |
| `revokeFailed` | `Chưa thu hồi được. Thử lại sau.` |

## Acceptance criteria
- [ ] **`/design`:** shows `danger` at `md` and `lg`.
- [ ] **Decision delete:** the confirm looks and works as before.
- [ ] **`/history`, a new guest with no links:** no "Link đã chia sẻ" section. The "Đã chọn" heading is above the history list or the empty state.
- [ ] **`/history` after sharing two cases** (one with "Không hết hạn"):
  - **Listing:** both links appear, newest first. Each row has the title, the latest winner and the expiry ("Hết hạn dd/MM/yyyy, HH:mm" or "Không hết hạn").
  - **Opening:** tapping a title opens `/s/<id>`.
  - **Revoking:** "Thu hồi" → confirm → "Thu hồi":
    - one `DELETE /api/shares/<id>` returns `204`
    - the row disappears
    - `/s/<id>` then shows "Link này không còn khả dụng"
    - revoking the last link removes the section, and focus lands on "Đã chọn"
  - **Cancelling:** "Hủy" restores the row and returns focus to its "Thu hồi".
- [ ] **Errors:**
  - Stop the api (`docker compose -f compose.dev.yaml stop api`) while confirming, then tap "Thu hồi": the row shows `revokeFailed`, and it works after restarting.
  - With the api stopped on load, both sections show their error lines.
- [ ] **Keyboard:**
  - `Tab` reaches each title link and each "Thu hồi"
  - focus rings are visible
- [ ] **Layout:** no horizontal scroll at 360 px with a long title. On 1280 px the rows show the button at the end.
- [ ] **Requests:** the network shows one `GET /api/shares` and one `GET /api/history` on `/history`, after the single `/api/me`.
- [ ] `make check` passes: domain 48, api 41. No new dependency; the lockfile is unchanged.

## Validation
```bash
make check
git grep -n "confirmDelete" -- apps/web/src
git diff --name-only feat/phase-6-result-history...HEAD -- apps/web/src | grep -v -e "\.ts$" -e "pages/design/" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px|style=" --
git diff --stat feat/phase-6-result-history...HEAD
```
- The `confirmDelete` grep must be empty.
- The literal grep checks the changed `.tsx`/`.css` files, excluding the dev-only design page, and must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.
- Do not print secrets from `.env.dev`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md). The web app has no test runner; do not add one.

## Git
- Branch `feat/6-5b-shared-links` from `feat/phase-6-result-history`.
- Make exactly two commits:
  - `feat(web): add a danger button variant`, for R1
  - `feat(web): list and revoke shared links in history`, for R2–R4
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including:
   - the requests seen on `/history`
   - the result of a revoke and of `/s/<id>` afterwards
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check, on a phone width and on desktop:
   - `/history` with a few shared links
   - revoking one link, then opening it
   - the decision delete confirm, unchanged
   - the `danger` button on `/design`
