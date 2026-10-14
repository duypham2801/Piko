# HANDOFF FR-3 — "Đi thôi" closes the case, mode selector in the navigation, "Random" title

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

After the final engineering review the owner made three product decisions (**D-036**, P2–P4 in `docs/DECISIONS.md`). FR-1 and FR-2 are merged into the integration branch `feat/final-review`. FR-2 added the following, which this task builds on:
- `play()` in `useCaseOpening`
- shared list stores with `invalidateHistory()` / `invalidateDecisions()` (`lib/listStore.ts`, `features/history/useHistoryList.ts`)
- `useHistorySave` (`features/case-opening/useHistorySave.ts`)

### P2 — today "Đi thôi" only saves
- In the case overlay (`features/case-opening/CaseOpening.tsx`), "Đi thôi" calls `useHistorySave().save(...)`. The overlay stays open with:
  - "ĐANG LƯU…" / "ĐÃ LƯU" on the button
  - an in-dialog status line ("Chưa lưu được vào lịch sử…")
  - a focus move to "Mở lại" after the save
- **The owner wants "Đi thôi" to end the flow:**
  - The overlay **closes**.
  - The screen underneath (the preview, or the builder for a draft) shows a **result card**: "Hôm nay: <winner>", with the time and a "Xem lịch sử" link.
  - A short **toast** says "Đã lưu vào Lịch sử".
  - The sidebar "Gần đây" updates at once. FR-2's `invalidateHistory()` already does this.
- **If the save fails** (rule 5, a network failure never blocks a decision), the overlay **still closes**. The card shows the result with "Chưa lưu được · Thử lại".
- **The overlay closes before the save finishes,** so the save must **outlive the overlay**.
- **A reload must never save twice,** so the pending save must not live in `history.state`.

### P3 — the mode selector sits on Home
- `features/home/ModeSelector.tsx` is a radio fieldset (Một mình enabled; Cặp đôi and Nhóm bạn disabled with a "Sắp có" badge). It is rendered on Home before the quick picks (`HomePage.tsx`).
- The owner wants it **in the navigation**, as a compact control, because Couple/Group will later start there.
- Couple/Squad stay locked "Sắp có" (CLAUDE.md rule 9). There is no mode state beyond "solo" today.

### P4 — the builder title is required
- `DecisionForm` validates the title with the shared `DecisionDraft` schema, which needs at least 1 character.
- The owner wants the title **optional**: an empty title is saved (and used for a draft case) as **"Random"**.

## Scope
- P2, P3 and P4 below.

## Out of scope (do NOT do)
- **FR-4:** skip link, other focus fixes, rate limiting, pruning.
- Any API, domain or schema change: the domain title stays required, and the web fills "Random" before validation.
- A global notification system. Only one toast is needed.
- Persisting the result card across reloads.
- Share actions on the result card.
- Auto-spin (P1: kept as is).

## Files to create / modify
- `apps/web/src/features/case-opening/pickStore.ts` (new; replaces `useHistorySave.ts`, which is deleted): P2.
- `apps/web/src/features/case-opening/CaseOpening.tsx` and `CaseOpening.module.css`: P2.
- `apps/web/src/features/preview/ResultCard.tsx` and `ResultCard.module.css` (new): P2.
- `apps/web/src/components/ui/Toast.tsx` and `Toast.module.css` (new): P2.
- `apps/web/src/features/preview/DecisionPreview.tsx`, `features/presets/PresetPreviewPage.tsx`, `features/decisions/DecisionPreviewPage.tsx`, `features/builder/DecisionForm.tsx`: pass `source` and render the card (P2), and the title default (P4).
- `apps/web/src/features/home/ModeSelector.tsx` / `.module.css` (move to `app/` if it is now only used by the navigation), `app/AppNav.tsx` / `.module.css`, `features/home/HomePage.tsx`: P3.
- `apps/web/src/i18n/vi.ts`: new keys only.
- `apps/web/src/pages/design/*`: `Toast` and the compact mode selector.

## Requirements

### P2.1 — `pickStore`: the save that outlives the overlay
- **A module-level store** (same style as `lib/listStore.ts`, read with `useSyncExternalStore`). It holds **the last pick** of this page session:
  ```ts
  type Pick = {
    source: HistorySourceInputData;
    entry: HistoryEntryCreateData; // source + decision snapshot + result
    winner: DecisionOptionData;
    pickedAt: string; // ISO time of "Đi thôi"
    status: 'saving' | 'saved' | 'error';
  };
  ```
- **`startPick(entry, winner)`:**
  - replaces the current pick
  - sets `saving`
  - calls `createHistoryEntry(entry)`
  - on success: `saved` and `invalidateHistory()`
  - on failure: `error`
  - A response for a pick that has since been replaced is ignored (generation guard).
- **`retryPick()`:** re-sends the current pick's entry when it is in `error`.
- **`usePick(source)`:** returns the current pick only when its `source` equals `source` (same kind and same `decisionId` / `slug`; any `draft` matches `draft`), otherwise `null`.
- **Memory only.** A reload clears it, so nothing is saved twice.
- **Delete `useHistorySave.ts`.** Move `createDecisionSnapshot` next to its users (for example `pickStore.ts`) and keep using it for the share dialog.

### P2.2 — "Đi thôi" in the overlay
- **"Đi thôi"** calls `startPick(...)` with the revealed state (source, the one decision snapshot, the result) and the winner option, then **closes the dialog** (`dialogRef.current?.close()`). The existing `onClose` navigates to `backTo`.
- **Remove from the overlay** everything that only served the in-dialog save:
  - the "Đang lưu…/Đã lưu" button states
  - `historySaveStatus` and its focus effects (saving → title, saved → "Mở lại")
  - the history status `<p>` with `aria-live`
- **Keep:**
  - the "Chỉ còn 2 lựa chọn cuối." hint, and the reserved status line in the 8-4 footer, which now only needs the hint
  - "Mở lại", "Không phải hôm nay", "Chia sẻ" and its dialog
  - `recordShareSpin`
  - the spin and reveal focus effects (8-2)
- **The 8-4 footer reservation** must still hold the strip still. Recompute it if the removed status line changes the revealed footer height, and say what you changed.

### P2.3 — `ResultCard` on the screen underneath
- **Where:**
  - in `DecisionPreview`, directly under the header (title + lead), for presets and saved decisions
  - in `DecisionForm` (draft case), directly under the page title
- **Inputs:**
  - `DecisionPreview` gets a `source` prop, passed by `PresetPreviewPage` (`{ kind: 'preset', slug }`) and `DecisionPreviewPage` (`{ kind: 'decision', decisionId }`).
  - The builder uses `{ kind: 'draft' }`.
- **The card renders only when `usePick(source)` returns a pick.** It contains:
  - `OptionGlyph` + **"Hôm nay: <winner label>"** (one line, the winner in display font)
  - the pick time (reuse `formatHistoryTime`) and a **"Xem lịch sử"** link to `/history`
  - **status:**
    - `saving`: muted "Đang lưu…"
    - `saved`: nothing extra (the toast confirms it)
    - `error`: danger text "Chưa lưu được" and a `Button` (outline, md) "Thử lại", which calls `retryPick()`
- **Style:**
  - an existing `Card` tone. Use `accent` (lemon, navy text) so it echoes the in-dialog winner panel.
  - tokens only, no new colours
  - It must not push the sticky "MỞ CASE" bar (8-3) off its position: the card is in the normal flow above the options.
- **Focus:** when the overlay closes after "Đi thôi", focus moves to the card (`tabIndex={-1}`, `focus()` without `preventScroll`, so it scrolls into view). The card is a labelled region (`aria-labelledby` its heading text).
- **A new pick replaces the card's content.** The card stays while the user is on that screen and comes back if they return to it in the same page session.

### P2.4 — `Toast`
- **New primitive `Toast`:** `{ message: string; onDone: () => void }`.
  - `role="status"`
  - fixed, top centre, below the mobile top bar (`--space-4` + the bar's height on phones; `--space-4` on desktop)
  - `--color-text` on `--color-surface` with the chunky border and shadow tokens, `--radius-pill`
  - enters with `opacity` + `transform` (`--duration-normal`, `--ease-out`)
  - stays about 3 seconds (a named TS constant, `TOAST_VISIBLE_MS`), then calls `onDone`
  - reduced motion: no movement, same timing
- **`ResultCard` shows one** with "Đã lưu vào Lịch sử" when its pick's status turns `saved`, only for a save that happened while the card was mounted (not again on revisit).
- Add `Toast` to `/design`.

### P3 — Compact mode selector in the navigation
- **Remove `<ModeSelector />` from Home.**
- **Desktop sidebar (from `64rem`):**
  - Under the logo and above "Lịch sử", a compact segmented row of the three modes: a radio group, each item a small pill with the emoji and a short label. The disabled ones show "Sắp có" as a small badge or a muted suffix.
  - Height about one `--tap-target-min`, and no wider than the sidebar.
  - Checked style: the current `primary` fill with `--color-on-primary-strong`, as today.
- **Mobile top bar (below `64rem`):**
  - A 44 px icon button showing the current mode's emoji (🙋), with `aria-label` "Chế độ: Một mình" (new i18n key with the mode name). Place it between the logo and "Lịch sử".
  - It opens the existing `Sheet` titled "Chế độ", with the same radio group at full width.
  - Check that the top bar still fits at 360 px with no wrap or overflow.
- **Behaviour is unchanged:** only "solo" is selectable, nothing is stored, and the disabled options cannot be checked. Keep the 8-2 hover rules (none on disabled) and the focus ring through `:has(input:focus-visible)`.
- One `ModeSelector` component with a `variant` (or two tiny wrappers) is fine. Do not duplicate the mode list.

### P4 — Optional title, default "Random"
- **New i18n key `defaultDecisionTitle: 'Random'`.**
- **In `DecisionForm`, before schema validation** (for "Lưu" and for "Mở case"): if the trimmed title is empty, use `t('defaultDecisionTitle')`. Do this only in the payload; the field itself stays empty.
- **Remove the "Nhập tiêu đề." error path for an empty title.** The length limit still applies.
- **Hint:** the field shows "Để trống sẽ đặt tên là “Random”." through `TextField`'s existing `hint` prop (new i18n key).
- If the "required title" message key is no longer used, delete it.

## Allowed dependencies
- None.

## Acceptance criteria
- [ ] **P2, preset and saved decision:**
  - "Đi thôi" closes the overlay at once.
  - The preview shows "Hôm nay: <winner>" with the time and "Xem lịch sử", and focus is on the card.
  - A toast "Đã lưu vào Lịch sử" appears and goes away after about 3 s.
  - The sidebar "Gần đây" shows the entry without a reload.
  - Exactly **one** `POST /api/history`.
- [ ] **P2, API refused** (block only `/api/*`):
  - "Đi thôi" still closes.
  - The card shows "Chưa lưu được" + "Thử lại", and there is no toast.
  - After unblocking, "Thử lại" saves once, then the toast shows.
- [ ] **P2, reload after "Đi thôi":** no card, and **no** second `POST /api/history`.
- [ ] **P2, draft case** (builder "Mở case" → "Đi thôi"): back on the builder with the card under the title. The form keeps what the user typed.
- [ ] **P2, overlay:**
  - no "Đã lưu" button state and no in-dialog save status
  - the strip still does not move at the reveal at 1280×800 and 360×740
  - focus sequence: "Mở case" → title → "Đi thôi"
- [ ] **P3:**
  - Home has no mode block.
  - Desktop sidebar: a compact mode row.
  - 360 px top bar: an emoji button that opens a sheet with the three modes; it fits with no overflow.
  - Couple/Squad cannot be selected.
- [ ] **P4:**
  - Saving with an empty title creates "Random" (sidebar, Home and History show "Random").
  - Opening a case from the builder with an empty title shows "Random" as the overlay title.
  - The field shows the hint, and no error.
- [ ] `git grep -n "useHistorySave" -- apps/web/src` is empty.
- [ ] No raw literals, no horizontal scroll at 360, 768, 1280 and 1920 px.
- [ ] `make check` passes with 0 lint warnings: domain 48, api 52. Lockfile unchanged.

## Validation
```bash
make check
git grep -n "useHistorySave" -- apps/web/src
git diff --name-only feat/final-review... -- apps/web/src | grep "\.css$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" --
git diff --stat feat/final-review...
```
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.
- To block the API in devtools, match only `/api/*`, never `*/api/*`. The latter also blocks Vite's `/src/lib/api/*` modules.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `feat/FR-3-go-closes` from `feat/final-review`.
- Commits (suggested):
  - `feat(web): "Đi thôi" closes the case and shows a result card`
  - `feat(web): toast primitive`
  - `feat(web): compact mode selector in the navigation`
  - `feat(web): optional builder title defaulting to Random`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts and the lint summary
4. Deviations from this handoff and why
5. Known issues / open questions
6. The `POST /api/history` counts for the success, failure + retry and reload cases, and any change to the 8-4 footer reservation
7. **READY FOR VISUAL REVIEW.** The owner should check:
   - "Đi thôi" → the card and toast, on a phone and on desktop
   - the mode selector in the sidebar and in the top bar
   - the builder with an empty title
