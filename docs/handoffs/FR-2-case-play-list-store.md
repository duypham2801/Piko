# HANDOFF FR-2 — The case plays a result, and a shared list store

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

The final engineering review (`docs/FINAL_ENGINEERING_REVIEW.md`, items A1–A3) and **D-036** ask for three structural changes before Phase 9. They prepare FR-3 ("Đi thôi" closes the case and the sidebar updates at once) and the later Couple/Group modes. Work happens on the integration branch `feat/final-review`. FR-1 is merged into it.

### A1 — The case hook always picks the winner itself
- `apps/web/src/features/case-opening/useCaseOpening.ts` exposes `open(spinOptions = pool, seed?)`. It always runs `select(spinOptions, seed)`, then `buildAnimationPlan(result, spinOptions)`, then dispatches `open`.
- The UI can therefore only play a result it computed locally:
  - `/s/:id` "Xem lại lượt quay" (`features/share/SharedCasePage.tsx`, `replay`) calls `open(share.options, share.result.seed)`. It **recomputes** the winner from the seed instead of playing the stored `share.result`. This is only correct while the engine never changes.
  - Couple/Group (later) will get a winner decided by the server or room host.
- Rule 1 (the winner is decided before the animation) stays. This change only separates *who decides* from *who plays*.

### A2 — List data is fetched per component, on every navigation
- **`useDecisionList(reloadKey?)`** (`features/decisions/useDecisionList.ts`) and **`useHistoryList(limit?, reloadKey?)`** (`features/history/useHistoryList.ts`) each fetch in their own effect.
- **`app/NavLists.tsx`** (desktop sidebar) passes `pathname` as `reloadKey`. Every route change, including opening and closing a case overlay, refetches the full decision list (up to 100 × 20 options, zod-parsed) and the recent history.
- **Desktop `/`** (`features/home/HomePage.tsx`, lines 31 and 80) fetches the same two lists again in parallel.
- **`features/builder/ExistingOptionsPanel.tsx`** fetches the decisions once more.
- **The three list hooks are near copies**, and they have drifted:
  - only history has `retry`
  - `useDecisionList` keeps stale data with no signal
- **Mutations** (create/update/delete a decision in `DecisionForm.tsx` / `DecisionPreviewPage.tsx`, save a history entry in `CaseOpening.tsx`) reach the sidebar today only through the pathname refetch.

### A3 — `CaseOpening.tsx` does too much (348 lines)
- It mixes dialog/focus handling, the case flow, share state and the history save. The save is `saveRequestRef`, `historySaveStatus`, `resetSaveStatus` and `saveResult`, with a request-id race guard.
- The decision snapshot `{ category?, options, title }` is built twice: in `openShareDialog` and in `saveResult`.
- FR-3 will change what "Đi thôi" does, so the save needs one clean home first.

## Scope
- A1, A2 and A3 as specified below. Behaviour visible to the user does not change, except that list refetches disappear and the `/s/:id` replay becomes exact.

## Out of scope (do NOT do)
- **FR-3:** "Đi thôi" closing the overlay, the result card, the toast, the mode selector, the "Random" title.
- **FR-4:** accessibility, rate limiting, pruning.
- The selection algorithm, `SelectionResult`'s schema (A4 is a recorded decision only), the animation plan math, `caseOpeningState.ts` states.
- `useShareList` (one call site, with local `removeShare`). Leave it as is.
- `packages/domain`, `apps/api`, dependencies (no React Query or similar).

## Files to create / modify
- `apps/web/src/features/case-opening/useCaseOpening.ts`: A1.
- `apps/web/src/features/share/SharedCasePage.tsx`: A1, replay.
- `apps/web/src/lib/listStore.ts` (new): A2, the generic store.
- `apps/web/src/features/decisions/useDecisionList.ts`: A2, becomes a store reader plus `invalidateDecisions()`.
- `apps/web/src/features/history/useHistoryList.ts`: A2, store readers plus `invalidateHistory()`.
- `apps/web/src/app/NavLists.tsx`, `features/home/HomePage.tsx`, `features/builder/ExistingOptionsPanel.tsx`, `features/history/HistoryPage.tsx`: A2 callers (drop `reloadKey`).
- `apps/web/src/features/builder/DecisionForm.tsx`, `features/decisions/DecisionPreviewPage.tsx`: A2, invalidate after a successful mutation.
- `apps/web/src/features/case-opening/useHistorySave.ts` (new) and `CaseOpening.tsx`: A3, plus A2 invalidation after a save.

## Requirements

### A1 — `play(result, options)` and `open()`
- **`useCaseOpening` returns `play(result: SelectionResultData, options: readonly DecisionOptionData[])`.**
  - It builds the plan with `buildAnimationPlan(result, options)` and dispatches `open`, with everything `open()` does today apart from the selection: cancel the current animation, read reduced motion.
  - It returns `undefined` while spinning, as today.
- **`open(spinOptions = pool, seed?)` becomes**: draw a seed if none was given, run `select(spinOptions, seed)`, then `play(result, spinOptions)`.
  - It returns `{ options, result }` exactly as today. `CaseOpening` still uses `open()`, and `recordShareSpin` keeps working.
- **`SharedCasePage` `replay`** calls `play(share.result, share.options)`. "Tự quay thử" (`trySpin`) keeps calling `open()`.
- **If `buildAnimationPlan` throws** for a result that does not match its options (only possible with corrupt data), `play` lets it propagate as today. Do not add a silent fallback.

### A2 — One shared store per list
- **`lib/listStore.ts`** exports a small factory, for example `createListStore<T>(fetchList: () => Promise<T[]>)`. It returns an object with:
  - `subscribe(listener)` and `getSnapshot()`, for `useSyncExternalStore`
  - `invalidate()`
  - `retry()`
- **Snapshot:** `{ status: 'loading' | 'loaded' | 'error'; items: readonly T[] }`. The object identity is stable between changes (required by `useSyncExternalStore`).
- **Loading:**
  - The first subscriber starts the fetch. Later subscribers share the same in-flight request and the same snapshot. There is **no refetch on navigation or remount** while data is loaded.
  - `invalidate()` refetches in the background if anyone is subscribed, otherwise on the next subscribe. While it refetches, a loaded store **stays `loaded` with its current items**, so nothing flashes or hides. It swaps the items when the response arrives.
  - **A late response from a superseded request is ignored** (generation counter).
  - **An error** sets `status: 'error'` (items `[]`, as today). `retry()` sets `loading` and refetches.
  - No abort on unsubscribe: the request is shared. Just ignore the result if it is superseded.
- **Stores and hooks:**
  - **Decisions:** one store over `listDecisions()`.
    - `useDecisionList()` (no parameters) returns `{ status, decisions }`, the same shape callers use today.
    - Export `invalidateDecisions()`.
  - **Recent history (limit 5):** one store over `listHistory({ limit: 5 })`.
  - **Full history:** one store over `listHistory()`.
  - `useHistoryList(limit?)` picks the recent store when `limit === 5` and the full store otherwise. It returns `{ status, entries, retry }`.
    - Any other limit is not used. Type it as `5 | undefined`, so a new limit forces a deliberate change.
  - Export `invalidateHistory()`, which invalidates **both** history stores.
- **Callers:**
  - Remove `reloadKey` from `NavLists`. Remove the parameter from both hooks.
  - Keep every caller's rendering unchanged: Home, the sidebar, the builder panel, History.
- **Invalidation after successful mutations only:**
  - **Decisions:**
    - `DecisionForm`, after a successful create or update
    - `DecisionPreviewPage`, after a successful delete
  - **History:** after a successful history save (in `useHistorySave`, A3).
  - **Share revocation** keeps using `useShareList`'s local `removeShare`.

### A3 — `useHistorySave` and one decision snapshot
- **New hook `useHistorySave({ source, title, category })`.** It returns `{ status, save(snapshot), reset() }`.
  - `status` is today's `HistorySaveStatus` (`idle | saving | saved | error`).
  - `save` takes `{ options, result }` from the revealed state.
  - It owns the request-id race guard exactly as today (`saveRequestRef`).
  - On success it calls `invalidateHistory()`.
  - `reset()` replaces `resetSaveStatus`.
- **`CaseOpening.tsx`:**
  - Use the hook. Build the decision snapshot (`{ category?, options, title }`) in **one** place, shared by the share dialog and the save.
  - Keep **all** current behaviour:
    - the focus effects keyed on `state.status` and the save status (8-2)
    - the status line
    - "Đã lưu"
    - `recordShareSpin`
    - "Không phải hôm nay"
    - the share dialog and its return focus
  - Aim for `CaseOpening.tsx` clearly under 300 lines without hiding logic in more indirection.

## Allowed dependencies
- None. `useSyncExternalStore` comes from React.

## Acceptance criteria
- [ ] **A1:**
  - On `/s/:id`, "Xem lại lượt quay" stops on `share.result.winnerId`, and the revealed winner equals the stored winner. Report both ids from the console.
  - "Tự quay thử" still draws a new random result.
  - The case overlay still works for presets and saved decisions, including "Không phải hôm nay".
- [ ] **A2, requests (devtools Network, `/api/` only):**
  - A cold desktop `/` sends exactly **1** `GET /api/decisions` and **1** `GET /api/history?limit=5`.
  - Then, in that order: open a saved decision, open its case, close it, open another decision, go to `/history`, go back to `/`. This sends **0** further `GET /api/decisions` and 0 further `GET /api/history?limit=5`. `/history` sends its own `GET /api/history` once.
  - Report the request list.
- [ ] **A2, freshness:**
  - Creating, editing or deleting a decision updates the sidebar "Sổ tay" without a reload.
  - "Đi thôi" (saved) updates the sidebar "Gần đây" and Home "Gần đây" without a reload. A refetch is fine.
  - Nothing flashes to a loading state during these refetches.
- [ ] **A2, errors:** with the API refused, the sidebar and Home still show their failure lines, and History "Thử lại" refetches.
- [ ] **A3:**
  - `CaseOpening.tsx` builds the decision snapshot once.
  - The save race guard and the focus sequence are unchanged: "Mở case" → title → "Đi thôi" → "Mở lại" after a save.
- [ ] `git grep -n "reloadKey" -- apps/web/src` is empty.
- [ ] `make check` passes with 0 lint warnings: domain 48, api 52. Lockfile unchanged.

## Validation
```bash
make check
git grep -n "reloadKey" -- apps/web/src
wc -l apps/web/src/features/case-opening/CaseOpening.tsx
git diff --stat feat/final-review...
```
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Branch `refactor/FR-2-case-play-list-store` from `feat/final-review`.
- Commits (suggested):
  - `refactor(web): the case can play a given result`
  - `refactor(web): shared list stores with invalidation`
  - `refactor(web): extract useHistorySave from CaseOpening`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts and the lint summary
4. Deviations from this handoff and why
5. Known issues / open questions
6. The A1 winner ids, the A2 request list, and `CaseOpening.tsx`'s line count before and after
7. What the owner should check in the browser:
   - the `/s/:id` replay
   - the sidebar updating after a save or an edit
   - no extra loading flashes
