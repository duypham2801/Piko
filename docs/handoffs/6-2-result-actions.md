# HANDOFF 6-2 — Result actions: "Đi thôi", "Mở lại", "Không phải hôm nay"

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decision **D-030** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 6 adds result actions, history and sharing (D-030).

**Task 6-1 is done.** It added `POST/GET /api/history` (`apps/api/src/routes/history.ts`) and the domain schemas in `packages/domain/src/api/history.ts`.
- `POST /api/history` takes a `HistoryEntryCreate`:
  - `source`: a saved decision `{ kind: 'decision', decisionId }`, a preset `{ kind: 'preset', slug }` or an unsaved draft `{ kind: 'draft' }`
  - `decision`: a `DecisionDraft` snapshot (title, optional category, options)
  - `result`: the `SelectionResult`
- It returns `201` with a `HistoryEntry`.
- The server re-runs `select(decision.options, result.seed)` and rejects a mismatch. So `decision.options` must be **exactly** the options passed to `select`, including `enabled: false` options.
- The route requires a session (`401 session_required` without one).

**The case screen today** is `apps/web/src/features/case-opening/CaseOpening.tsx`. It is mounted in three places:
- `features/decisions/DecisionCasePage.tsx`: `/decisions/:id/open`, a saved decision
- `features/presets/PresetCasePage.tsx`: `/presets/:slug/open`, a preset
- `features/builder/DecisionForm.tsx`: `?view=case`, an unsaved builder draft

Both case pages apply the preview switches (`?off=`) through `useOffOptions` before passing `options`. After a reveal, the screen shows the winner panel and one button, "Mở lại", which spins again.

**Owner decisions (D-030)**: the revealed result offers these actions.
- **"Đi thôi"** saves the result to history.
  - Best-effort (CLAUDE.md rule 5): a failed save shows a non-blocking error and lets the user retry. The decision is never blocked.
  - Only "Đi thôi" records history. Spins that are not accepted are never stored.
- **"Mở lại"** spins the same pool again with a new seed.
- **"Không phải hôm nay"** removes the current winner from the pool **for this screen only** and **spins again at once**.
  - It is disabled when only two candidates remain, because a case needs at least two.
  - Exclusions last until the user leaves the case screen. "Mở lại" keeps them.
- "Chia sẻ" is a later task (6-5) and is **not** part of this task.

## Scope
- R1: move the session retry helper so every API module can share it, and add a history API client.
- R2: the exclusion pool and an `open` that accepts the pool to spin.
- R3: the result actions UI on the case screen, with the best-effort save.
- R4: pass the history source and snapshot fields from the three mount points.
- R5: i18n strings.

## Out of scope (do NOT do)
- "Chia sẻ", share links, `/history`, Home "Gần đây" (6-3 and later). Do not add `listHistory` to the client yet.
- Any change to `packages/domain`, `apps/api`, the DB or dependencies.
- Changing the carousel, the animation plan, the confetti, the reveal timing or the state machine's states.
- Showing which options were excluded, undo of an exclusion, or persisting exclusions in the URL.
- Navigating anywhere after "Đi thôi".
- New shared UI primitives in `components/ui/`. Use `Button` as it is.

## Files to create or modify
- `apps/web/src/lib/api/session.ts`: receives `withSession` (R1)
- `apps/web/src/lib/api/decisions.ts`: imports `withSession` instead of defining it
- `apps/web/src/lib/api/history.ts` (new)
- `apps/web/src/features/case-opening/useCaseOpening.ts`
- `apps/web/src/features/case-opening/CaseOpening.tsx` + `.module.css`
- Optionally, new files in `features/case-opening/` for the actions block (e.g. `ResultActions.tsx` + `.module.css`) and a save hook (e.g. `useHistorySave.ts`). Create them only if `CaseOpening.tsx` would otherwise grow hard to read.
- `apps/web/src/features/decisions/DecisionCasePage.tsx`
- `apps/web/src/features/presets/PresetCasePage.tsx`
- `apps/web/src/features/builder/DecisionForm.tsx`: only the `CaseOpening` call
- `apps/web/src/i18n/vi.ts`

## Requirements

### R1 — API client
- Move `withSession` unchanged from `lib/api/decisions.ts` to `lib/api/session.ts` and export it. `decisions.ts` imports it. Its behaviour does not change.
- Add `lib/api/history.ts`:
  ```ts
  export async function createHistoryEntry(input: HistoryEntryCreateData): Promise<HistoryEntryData>
  ```
  - `await ensureSession()` first (CLAUDE.md rule 12), then `withSession(() => apiSend('POST', '/api/history', input, HistoryEntry))`.
  - Same shape as `createDecision`. Nothing else goes in this file in this task.

### R2 — Pool and exclusions
- `CaseOpening` keeps the excluded option ids in local state (`ReadonlySet<string>`, initially empty).
  - The **pool** is `options` with every excluded id mapped to `enabled: false`. Keep option order and every other field unchanged.
  - Memoize the pool on `options` and the excluded set.
  - `useCaseOpening` receives the pool instead of `options`.
- Exclusions live only in this component's state. They reset when the screen unmounts, or when the parent changes the `key` (the `?off=` change already remounts it).
- `useCaseOpening`'s `open` takes an optional argument: the options to spin.
  - Defaults to the hook's current `options`.
  - "Không phải hôm nay" calls it with the new pool, so the spin starts in the same click, without waiting for a re-render.
  - `select` and `buildAnimationPlan` both use that argument.
  - Nothing else in the hook changes.
- **"Không phải hôm nay" handler:**
  - only acts in `revealed`
  - computes the next excluded set (current set plus `state.result.winnerId`) and the next pool
  - stores the set
  - calls `open(nextPool)`
  - Guard: do nothing if the next pool would have fewer than `DECISION_LIMITS.minEnabledOptions` enabled options.
- The button is **disabled** when `state.result.candidateIds.length <= DECISION_LIMITS.minEnabledOptions`. Use the result's candidates, not a recount.
- "Mở lại" calls `open()` with the current pool, so exclusions are kept.

### R3 — Result actions UI
**Button area by state:**
- **`ready`**: one large primary button `t('openCase')`, as today.
- **`spinning`**: the same button, disabled, `t('opening')`, as today.
- **`revealed`**: an actions block replaces the single button.
  - **"Đi thôi"** (`t('goNow')`): primary, `size="lg"`, full width of the block.
  - Below it, a row with two `outline` buttons:
    - **"Mở lại"** (`t('spinAgain')`)
    - **"Không phải hôm nay"** (`t('notToday')`)
  - When "Không phải hôm nay" is disabled, show `t('minOptionsHint')` under the row and link it with `aria-describedby`.

**Layout:**
- The block is as wide as the winner panel: `min(100%, var(--content-max-width))`.
- Use a grid with `--space-3` gaps.
- The two secondary buttons share the row equally. At 360 px they must not overflow:
  - let the labels wrap,
  - or stack the two buttons under `min-width` of your choice.
- Tokens only: no raw colors, durations, shadows or `px` in component CSS.

**Save behaviour ("Đi thôi"):**
- On click, call `createHistoryEntry` with:
  - `source` from the new `source` prop (R4)
  - `decision`: `{ title, category, options: <the exact options passed to select for this result> }`
    - Keep the pool used for the current spin, e.g. on the reveal state or in a ref set when `open` runs.
    - Do not rebuild it from props at save time: after "Không phải hôm nay" the pool for the shown result and the current pool must be the same object. Prove this in the report.
    - Omit `category` when it is undefined.
  - `result: state.result`
- **Status per result:** `idle → saving → saved | error`.
  - While `saving` or after `saved`, "Đi thôi" is disabled, so one accepted result is saved at most once.
  - While `saving`, its label is `t('saving')`.
  - After `saved`, its label is `t('saved')`.
  - On `error`, the button is enabled again so the user can retry.
- **A new spin resets the status to `idle`.**
  - A response that arrives after a new spin started belongs to the old result and must be ignored. Compare with a request token or the result object.
  - "Mở lại" and "Không phải hôm nay" stay enabled while saving. Do not block them.
- **Status line:**
  - `saved` shows `t('historySaved')`.
  - `error` shows `t('historySaveFailed')`.
  - Put it inside a polite live region under the actions, separate from the winner `role="status"` region.
  - Use the existing semantic text tokens for error vs success, as `DecisionForm` does.
  - Every error is treated the same: network, 4xx or 5xx. No error code is shown.
- Never `console.log`. Do not navigate after saving.

### R4 — Mount points
- `CaseOpening` gets two new props:
  - `source: HistorySourceInputData`
  - `category?: string`
- **`DecisionCasePage`:**
  - `source: { kind: 'decision', decisionId: id }`
  - `category: decision.category`
- **`PresetCasePage`:**
  - `source: { kind: 'preset', slug: preset.slug }`
  - `category: preset.decision.category`
- **`DecisionForm`'s case view:**
  - `source: { kind: 'draft' }`, also when editing a saved decision, because the draft may contain unsaved edits
  - `category: parsed.data.category`

### R5 — i18n (`vi.ts`)
Add these keys and reuse existing ones where they already fit (`spinAgain`, `saving`, `saved`, `minOptionsHint`):

| Key | Text |
|---|---|
| `goNow` | `Đi thôi` |
| `notToday` | `Không phải hôm nay` |
| `historySaved` | `Đã lưu vào lịch sử.` |
| `historySaveFailed` | `Chưa lưu được vào lịch sử. Bạn cứ đi, thử lại sau nhé.` |

## Acceptance criteria
- [ ] Every case screen (`/presets/food/open`, `/decisions/<id>/open` and the builder `?view=case`):
  - shows "Mở case" before a spin
  - after the reveal shows "Đi thôi", "Mở lại" and "Không phải hôm nay"
- [ ] "Đi thôi" saves exactly one entry per accepted result:
  - the network tab shows one `POST /api/history` → `201`, with the correct `source`
  - `GET /api/history` lists it, with the shown winner
  - a second click does nothing
- [ ] With the api stopped (`docker compose -f compose.dev.yaml stop api`), "Đi thôi":
  - shows the non-blocking error
  - leaves every other action working
  - after restarting the api, a retry saves the entry
- [ ] "Không phải hôm nay" spins at once without the previous winner.
  - Repeat until two candidates remain: the button is disabled and the hint shows.
  - "Mở lại" keeps the exclusions.
  - Leaving the screen and coming back resets them.
- [ ] After one or more exclusions, "Đi thôi" returns `201`: the server re-check passes with the stored snapshot.
- [ ] With `?off=` set on a preset, the saved snapshot has those options as `enabled: false`.
- [ ] Reduced motion still works (short transition, clear reveal) for all three actions.
- [ ] `git grep -n "function withSession" -- apps/web/src` shows only `lib/api/session.ts`.
- [ ] `make check` passes: test counts unchanged, domain 48, api 27. No new dependency; lockfile unchanged.

## Validation
```bash
make check
git grep -n "function withSession" -- apps/web/src
git diff --name-only feat/phase-6-result-history...HEAD -- apps/web/src | grep -v "\.ts$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px|style=" --
git diff --stat feat/phase-6-result-history...HEAD
```
- The literal grep checks only the changed `.tsx`/`.css` files and must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.
- Check in the browser at 390 px and 1280 px.
  - For the save check, read the request body in DevTools.
  - Or query `docker compose -f compose.dev.yaml exec db psql -U piko -d piko -c "select source, title, created_at from decision_sessions order by created_at desc limit 5"`. Adjust the user and DB names to `.env.dev`; do not print secrets.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md). This task adds no domain or api logic, so no new tests.

## Git
- Branch `feat/6-2-result-actions` from `feat/phase-6-result-history`.
- Make exactly two commits:
  - `refactor(web): share session retry and add history client`, for R1
  - `feat(web): add result actions with best-effort history save`, for R2–R5
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including:
   - one `POST /api/history` request body after an exclusion (ids may be shortened)
   - the status code
   - how the saved options are guaranteed to be the pool used for that spin
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check at `localhost:5173/presets/food/open`, on a phone width and on desktop:
   - the three actions after a reveal and their layout
   - "Đi thôi" → "Đã lưu vào lịch sử."
   - "Không phải hôm nay" down to two candidates
   - "Mở lại" keeping the exclusions
