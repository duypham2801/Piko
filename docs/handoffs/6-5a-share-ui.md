# HANDOFF 6-5a — Share a case, and the public page `/s/:id`

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decision **D-030** in `docs/DECISIONS.md`, including its section "Shares API defaults (6-4, architect)". You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 6 adds result actions, history and sharing (D-030).

**What exists:**
- **The shares API (6-4)** is defined by the schemas in `packages/domain/src/api/shares.ts`.
  - **Owner routes** (session required), under `/api/shares`:
    - `POST /api/shares`
      - Body: `SharedCaseCreate` = `{ decision: DecisionDraft, result: SelectionResult | null, lifetime: '1d' | '7d' | '30d' | 'never' }`.
      - Returns `201` with a `SharedCase`.
      - Returns `409 share_limit_reached` when the user already has 50 active links.
    - `POST /api/shares/:id/spins`
      - Body: `SharedCaseSpin` = `{ options, result }`.
      - Records the latest spin and returns `200` with the `SharedCase`.
      - The options must be the shared options, with only the `enabled` flags allowed to change. The result is re-checked on the server.
    - `GET /api/shares` (list) and `DELETE /api/shares/:id` (revoke) also exist. They are **not** used in this task.
  - **The public read**, `GET /api/public/shares/:id`:
    - It runs without session middleware, so it never sets a cookie or creates a guest.
    - Unknown, revoked and expired ids all return `404 not_found`.
    - The response includes the option weights. **The UI must never display weights or odds (D-010).**
- **The case screen** is `features/case-opening/CaseOpening.tsx` with `useCaseOpening.ts`.
  - After the reveal it shows:
    - "Đi thôi", which saves to history
    - "Mở lại"
    - "Không phải hôm nay", which sets `enabled: false` on the winner for this screen and spins again
  - The revealed state carries `state.options` (exactly what was passed to `select`) and `state.result`.
- **`useCaseOpening(pool).open(spinOptions = pool)`** generates a random seed, calls `select` and `buildAnimationPlan`, and dispatches `open`.
- **The app shell:** `app/App.tsx` calls `ensureSession()` in a mount effect for **every** route. This would create a guest on a shared link, which D-030 forbids.
- **The only modal today** is `features/builder/ExistingOptionsPanel.tsx`.
  - It is a native `<dialog>` with `showModal()`, a backdrop click to close, and a header with a title and a "Xong" button.
  - It shows as a bottom sheet on phones and is centered from `48rem`.
- **Weight controls:** the preview pages show weight (priority) controls. The public page must not reuse them.

**Owner decisions (D-030):**
- "Chia sẻ" is available as soon as a result is revealed.
- The lifetime is chosen when sharing: 1 day, **7 days (default)**, 30 days or no expiry.
- Delivery uses the Web Share API, with a copy-to-clipboard fallback.
- **The public page shows:**
  - the title
  - the option list: labels and emoji only
  - **"Xem lại lượt quay"**: replays the shared spin with the same seed, so it lands on the same winner
  - **"Tự quay thử"**: a spin with a new seed that runs only in the viewer's browser and is never stored
- Opening a shared link **never creates a guest user**.
- An expired or revoked link shows a "link no longer available" page.

**Task split:** 6-5a is this task. 6-5b adds "Link đã chia sẻ" with revoke in `/history`. 6-6 adds live viewing.

## Scope
- S1: extract two shared pieces: a `Sheet` dialog primitive and a `WinnerPanel`.
- S2: a share client, and a seed option on `open`.
- S3: "Chia sẻ" on the case screen, the share dialog, and recording later spins.
- S4: no session bootstrap on `/s/:id`.
- S5: the public page `/s/:id`.
- S6: i18n strings.

## Out of scope (do NOT do)
- "Link đã chia sẻ", listing or revoking links. That is 6-5b.
- **Live viewing:** SSE, polling, reactions. That is 6-6.
- Sharing before the first spin. The API allows `result: null`; the UI does not offer it yet.
- **Server and dependency changes:**
  - any change to `packages/domain`, `apps/api` or the DB
  - new dependencies, a QR code, an icon set
- The navigation shell or sidebar (Phase 7).
- Displaying the link's expiry date.
- Any change to "Đi thôi", "Mở lại" or "Không phải hôm nay" behaviour, apart from recording spins (S3).

## Files to create or modify
- `apps/web/src/components/ui/Sheet.tsx` + `.module.css` (new)
- `apps/web/src/features/builder/ExistingOptionsPanel.tsx` + `.module.css`: use `Sheet`
- `apps/web/src/pages/design/DesignPage.tsx`: a `Sheet` demo
- `apps/web/src/features/case-opening/WinnerPanel.tsx` + `.module.css` (new)
- `apps/web/src/features/case-opening/CaseOpening.tsx` + `.module.css`
- `apps/web/src/features/case-opening/useCaseOpening.ts`
- `apps/web/src/lib/api/shares.ts` (new)
- `apps/web/src/features/share/ShareDialog.tsx` + `.module.css` (new)
- `apps/web/src/features/share/SharedCasePage.tsx` + `.module.css` (new)
- `apps/web/src/features/share/usePublicShare.ts` (new)
- `apps/web/src/app/SessionLayout.tsx` (new), `apps/web/src/app/App.tsx`
- `apps/web/src/app/NotFoundPage.tsx`: optional props (see S5)
- `apps/web/src/i18n/vi.ts`

## Requirements

### S1 — Shared pieces

#### `Sheet` (`components/ui/`)
Move the dialog shell out of `ExistingOptionsPanel`. Nothing visible changes.

```tsx
type SheetProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};
```

**Behaviour:**
- It renders a `<dialog>` and calls `showModal()` on mount. The parent mounts it conditionally, as `DecisionForm` already does.
- It is labelled by its `<h2>`. Use `useId`, not a hard-coded id.
- **Closing:**
  - a backdrop click closes it
  - `Esc` closes it (native behaviour)
  - the header button (`variant="outline"`, text `closeLabel`) closes it
  - `onClose` runs from the dialog's `close` event
- The body scrolls. The header stays visible.

**Styling:**
- Move the existing panel, backdrop, shell, header, body and `sheetIn` CSS from `ExistingOptionsPanel.module.css` into `Sheet.module.css`, unchanged:
  - a bottom sheet on phones
  - centered from `48rem`
  - no animation under reduced motion
- `ExistingOptionsPanel.module.css` keeps only its own content rules.

**Usage and demo:**
- `ExistingOptionsPanel` renders `<Sheet title={t('addFromExisting')} closeLabel={t('done')} onClose={onClose}>`. Its content is unchanged.
- **`/design` demo:** add a "Sheet" section to `DesignPage` with a button that opens a `Sheet` containing a short paragraph. Dev-only English labels are fine there (D-022).

#### `WinnerPanel` (`features/case-opening/`)
- Props: `option: DecisionOptionData`, `label: string`.
- It renders the existing accent `Card` with the emoji, the small label and the large winner name.
- Move the `.winnerPanel`, `.winnerEmoji`, `.winnerDetails`, `.winnerLabel` and `.winnerName` rules out of `CaseOpening.module.css`, unchanged.
- `CaseOpening` renders `<WinnerPanel label={t('winnerIs')} option={winner} />` inside its existing live region. It looks exactly as before.

### S2 — Client and seed

**`lib/api/shares.ts`:**
```ts
export async function createShare(input: SharedCaseCreateData): Promise<SharedCaseData>
export async function recordShareSpin(id: string, input: SharedCaseSpinData): Promise<SharedCaseData>
export async function fetchPublicShare(id: string, options?: { signal?: AbortSignal }): Promise<SharedCaseData>
```
- **Owner calls** (`createShare`, `recordShareSpin`): `await ensureSession()`, then `withSession(() => apiSend(...))`. This is the same pattern as `createHistoryEntry`.
- **`fetchPublicShare`:**
  - Use `apiGet('/api/public/shares/<id>', SharedCase, …)` directly.
  - **No `ensureSession`, no `withSession`.**
  - Encode the id with `encodeURIComponent`.

**`useCaseOpening.open`:**
- New signature: `open(spinOptions = pool, seed?: number)`.
  - When `seed` is given, use it.
  - Otherwise generate one as today.
- It returns `{ options, result }` (what it dispatched), or `undefined` when it did nothing.
- No other change to the hook.

### S3 — Sharing from the case screen

#### `CaseOpening`
**Share button:**
- In the revealed actions, below the "Mở lại" / "Không phải hôm nay" row, add a full-width `outline` `Button` `t('share')`.
- It opens the share dialog.
- It has `aria-haspopup="dialog"`.

**State:**
- `CaseOpening` keeps `share: SharedCaseData | null` for this screen visit. It starts as `null`, and leaving the screen forgets it.
- It keeps a `shareDialogOpen` boolean.
- When the dialog opens, take a snapshot of the current reveal for it:
  - `decision: { title, category?, options: state.options }`
  - `result: state.result`

**Recording later spins:**
- After a share exists, every new spin on this screen is recorded:
  - "Mở lại"
  - "Không phải hôm nay"
- Use the `{ options, result }` returned by `open(...)`, and call `void recordShareSpin(share.id, { options, result }).catch(() => {})` when the spin **starts**.
- It is best-effort. There is no UI for it and it never blocks the spin.
- Do not use an effect for this.

**History is independent of sharing.** Sharing does not save history, and "Đi thôi" does not share.

#### `ShareDialog` (`features/share/`)
**Props:**
```ts
{
  decision: DecisionDraftData;
  result: SelectionResultData;
  share: SharedCaseData | null;
  onShared: (share: SharedCaseData) => void;
  onClose: () => void;
}
```
It renders a `Sheet` with `title={t('shareTitle')}` and `closeLabel={t('close')}`.

**Step 1 — `share === null`:**
- A muted hint `t('shareHint')`.
- A lifetime picker:
  - a `<fieldset>` with `<legend>` `t('shareLifetimeLegend')`
  - four radio options: 1 day, 7 days, 30 days, no expiry
  - **7 days is selected by default**
  - follow the `ModeSelector` pattern: native radios with `visually-hidden` inputs and styled labels, plus a visible checked and `:focus-visible` state, using tokens only
- A primary full-width `Button` `t('createShareLink')`:
  - while the request runs it is disabled and shows `t('creatingShareLink')`
  - it calls `createShare({ decision, result, lifetime })`
  - on success it calls `onShared(share)`, which moves the dialog to step 2
- **Errors** appear in a `role="status"` line in the danger text style, and the button works again:
  - `409 share_limit_reached` → `t('shareLimitReached')`
  - anything else → `t('shareFailed')`
- Ignore stale responses after the dialog is closed.

**Step 2 — `share !== null`:**
This is also what the user sees when reopening the dialog later on the same screen.
- **The link field:**
  - URL: `new URL(`/s/${share.id}`, window.location.origin).href`
  - a `readOnly` `TextField` with the label `t('shareLinkLabel')`, showing the full URL
  - focusing it selects all the text
- **One primary full-width `Button`:**
  - **When `typeof navigator.share === 'function'`:**
    - The label is `t('sendLink')`.
    - It calls `navigator.share({ title: decision.title, url })`.
    - An `AbortError` (the user cancelled) shows nothing.
    - Any other error falls back to copying.
  - **Otherwise:**
    - The label is `t('copyLink')`.
    - It calls `navigator.clipboard.writeText(url)`.
    - Success → `t('linkCopied')` in the status line.
    - Failure → `t('copyFailed')`, and the link field is focused and selected so the user can copy it by hand.
- The status line is `role="status"`.

### S4 — No session on the public page
- **`app/SessionLayout.tsx`:**
  - It runs the existing `void ensureSession().catch(() => {})` mount effect.
  - It renders `<Outlet />`.
  - Remove that effect from `App`.
- **`App.tsx`:**
  - Wrap **every existing route, including `*`,** in `<Route element={<SessionLayout />}>`.
  - Add `<Route path="/s/:id" element={<SharedCasePage />} />` **outside** that layout.
- Nothing reachable from `SharedCasePage` may call `ensureSession`, `withSession` or any owner API.
- The "Tự tạo case trên PIKO" link (S5) goes to `/`, which runs the bootstrap. That is expected: the viewer chose to use the app.

### S5 — `/s/:id`

#### `usePublicShare(id)`
- States:
  - `loading`
  - `loaded` with the share
  - `notFound`, for an `ApiClientError` with status 404
  - `error`, with `retry()`
- Use the same abort and retry pattern as `useDecisionRecord`, without the location-state part.

#### `SharedCasePage`
**Document head, every state:**
- `<meta name="robots" content="noindex" />` (React 19 hoists it).
- The `<title>`:
  - loaded: `"{share.title} · {t('title')}"`
  - otherwise: `t('title')`

**States:**
- **`loading`:** `t('loading')`.
- **`notFound`:**
  - Render `NotFoundPage` with `title={t('shareUnavailableTitle')}` and `message={t('shareUnavailableLead')}`.
  - Add those two optional props to `NotFoundPage`: `title` defaults to `t('notFoundTitle')`, and `message` is a muted paragraph shown only when given.
  - Keep its "Về trang chủ" link.
- **`error`:** `t('shareLoadFailed')` and a `Button` `t('retry')`.
- **`loaded`:** one centred column, following the case screen layout (`--content-max-width`, `--space-*`, `--color-bg`). It has no `BackLink`, because the viewer did not come from inside the app. In order:
  1. **Brand:** a small "PIKO" wordmark, `t('title')`, in the display font. It is not a link.
  2. **Title:** `<h1>` with `share.title`.
  3. **Latest shared result:**
     - When `share.result` is not null: a line `t('sharedLatestResult')`, then the winner's emoji and label, then ` · ` and `formatHistoryTime(share.spunAt, now)`. Reuse the function from `features/history/historyTime.ts`.
     - Otherwise: `t('notSpunYet')`.
     - This line always shows the real shared result, whatever the viewer spins locally.
  4. **The stage:**
     - `CaseCarousel` + `Confetti`, driven by `useCaseOpening(share.options)`.
     - Then a live region with `WinnerPanel` after a reveal. Its label is:
       - `t('winnerIs')` after a replay
       - `t('tryResult')` after "Tự quay thử"
  5. **Actions, disabled while spinning:**
     - **"Xem lại lượt quay"** (`t('replaySpin')`)
       - A primary `lg` `Button`, shown only when `share.result` is not null.
       - It calls `open(share.options, share.result.seed)`. It lands on the shared winner (D-005).
     - **"Tự quay thử"** (`t('trySpin')`)
       - An `outline` `Button`, or the primary `lg` button when there is no result.
       - It calls `open()` with a fresh seed.
       - Nothing is sent to the server.
  6. **Options:**
     - `<h2>` `t('optionsHeading')`
     - a `<ul>` of the **enabled** options: emoji (`aria-hidden`) and label
     - **no weights, priority dots, odds or percentages**
     - labels wrap, with no horizontal scroll
  7. **Footer:** a text link `t('makeYourOwn')` to `/`, styled like `BackLink`'s accent text.
- Reduced motion behaves as on the case screen (the hook already handles it).

### S6 — i18n (`vi.ts`)

| Key | Text |
|---|---|
| `share` | `Chia sẻ` |
| `shareTitle` | `Chia sẻ case` |
| `shareHint` | `Ai có link đều xem được các lựa chọn và kết quả.` |
| `shareLifetimeLegend` | `Link có hiệu lực trong` |
| `shareLifetime1d` | `1 ngày` |
| `shareLifetime7d` | `7 ngày` |
| `shareLifetime30d` | `30 ngày` |
| `shareLifetimeNever` | `Không hết hạn` |
| `createShareLink` | `Tạo link` |
| `creatingShareLink` | `Đang tạo…` |
| `shareFailed` | `Chưa tạo được link. Kiểm tra mạng rồi thử lại.` |
| `shareLimitReached` | `Bạn đang có quá nhiều link chia sẻ. Thu hồi bớt rồi thử lại.` |
| `shareLinkLabel` | `Link chia sẻ` |
| `sendLink` | `Gửi link` |
| `copyLink` | `Sao chép link` |
| `linkCopied` | `Đã sao chép link.` |
| `copyFailed` | `Chưa sao chép được. Hãy chọn link rồi tự sao chép.` |
| `close` | `Đóng` |
| `sharedLatestResult` | `Kết quả đã chia sẻ:` |
| `notSpunYet` | `Chưa quay lần nào.` |
| `replaySpin` | `Xem lại lượt quay` |
| `trySpin` | `Tự quay thử` |
| `tryResult` | `Bạn quay thử ra` |
| `shareLoadFailed` | `Chưa tải được case này.` |
| `shareUnavailableTitle` | `Link này không còn khả dụng` |
| `shareUnavailableLead` | `Link có thể đã hết hạn hoặc đã bị thu hồi.` |
| `makeYourOwn` | `Tự tạo case trên PIKO` |

## Acceptance criteria
- [ ] **The builder's "Thêm từ có sẵn" sheet** looks and behaves exactly as before at 390 px and 1280 px. `/design` shows a working `Sheet` demo.
- [ ] **Sharing** (e.g. on `/presets/food/open`):
  - after a reveal, "Chia sẻ" opens the dialog with 7 days preselected
  - "Tạo link" makes one `POST /api/shares`, whose body carries `state.options` and `state.result`
  - the link appears; "Sao chép link" copies it (or "Gửi link" opens the share sheet where supported)
  - closing and reopening the dialog shows the same link with no new request
  - `Esc`, a backdrop click and "Đóng" all close it, and focus returns to "Chia sẻ"
- [ ] **Recording spins** (after sharing):
  - "Mở lại" and "Không phải hôm nay" each make one `POST /api/shares/<id>/spins` at spin start
  - reloading `/s/<id>` then shows the new latest result
  - with the api stopped, spins still run with no visible error
- [ ] **Share errors:**
  - with the api stopped, "Tạo link" shows `shareFailed`
  - after the api restarts, it works
- [ ] **`/s/<id>` in a fresh browser profile with no cookie:**
  - **requests:**
    - the network shows only `GET /api/public/shares/<id>`
    - **no `/api/me`, no `Set-Cookie`**
    - the dev DB `users` row count does not change
  - **content:**
    - the title, the latest shared result with its time, and the enabled options
    - no weights or odds anywhere
  - **spins:**
    - "Xem lại lượt quay" lands on the shared winner, every time
    - "Tự quay thử" spins with a random seed, shows "Bạn quay thử ra", and sends nothing to the server
    - the "Kết quả đã chia sẻ" line stays unchanged after a try
  - the page has `noindex`
- [ ] **Unavailable links:** a malformed id, an unknown UUID and an expired link all show "Link này không còn khả dụng" with "Về trang chủ".
  - To test an expired link, update `expires_at` in the dev DB, then restore the row or delete it afterwards.
- [ ] **Layout:** no horizontal scroll at 360 px on the case screen with the dialog open, or on `/s/<id>` with a long title and long labels. Under reduced motion, replay and try use the short transition.
- [ ] **Keyboard:**
  - the lifetime radios work with the arrow keys and show a focus ring
  - every new button and link is reachable with `Tab`
- [ ] `make check` passes: domain 48, api 41. No new dependency; the lockfile is unchanged.

## Validation
```bash
make check
git grep -n "ensureSession\|withSession" -- apps/web/src/features/share apps/web/src/app
git diff --name-only feat/phase-6-result-history...HEAD -- apps/web/src | grep -v -e "\.ts$" -e "pages/design/" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px|style=" --
git diff --stat feat/phase-6-result-history...HEAD
```
- **Session grep:** the first `git grep` must show only `app/SessionLayout.tsx`.
- **Literal grep:** it checks the changed `.tsx`/`.css` files, excluding the dev-only design page, and must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.
- Do not print secrets from `.env.dev`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md). The web app has no test runner; do not add one.

## Git
- Branch `feat/6-5a-share-ui` from `feat/phase-6-result-history`.
- Make exactly three commits:
  - `refactor(web): extract Sheet and WinnerPanel`, for S1
  - `feat(web): share a revealed case`, for S2, S3 and their i18n
  - `feat(web): add the public shared case page`, for S4, S5 and their i18n
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including:
   - the requests seen when sharing, when spinning after sharing, and on `/s/<id>` without a cookie
   - the `users` count before and after
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check, on a phone width and on desktop:
   - the "Chia sẻ" dialog and copying or sending the link
   - opening the link in a private window: replay, "Tự quay thử", the option list
   - an unavailable link
   - the builder's "Thêm từ có sẵn" sheet, unchanged
