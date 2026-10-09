# HANDOFF 6-5a-fix-1 — Simpler share state, public page layout

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

6-5a (the three implementer commits on `feat/6-5a-share-ui`) added the share dialog and the public page `/s/:id`. The architect reviewed it, and the behaviour is correct:
- **Checks:** `make check` passes (domain 48, api 41). The session and literal greps are clean.
- **Sharing:**
  - Sharing makes one `POST /api/shares` with `state.options` and `state.result`. Reopening the dialog shows the same link.
  - `Esc`, a backdrop click and "Đóng" all close the dialog, and focus returns to "Chia sẻ".
  - "Mở lại" and "Không phải hôm nay" each record one spin.
- **`/s/:id` in a fresh profile:**
  - only `GET /api/public/shares/:id`, no cookie, and the `users` count is unchanged
  - replay always lands on the shared winner
  - "Tự quay thử" sends nothing
  - no weights are shown
  - unavailable links show the right page

What remains is extra state and lookups in the new code, and two layout issues on the public page.

## Scope
- C1: one state for the share snapshot in `CaseOpening`.
- C2: simplify `ShareDialog`.
- C3: small simplifications in `useCaseOpening`, `CaseOpening` imports and the public page's result line.
- L1: the public page uses the case screen's wide layout on desktop.
- L2: the public option list uses the history list style.

## Out of scope (do NOT do)
- Any change in behaviour, requests or copy.
- "Link đã chia sẻ" and revoke (6-5b), live viewing (6-6).
- `packages/domain`, `apps/api`, dependencies, `components/ui/`.

## Files to modify
- `apps/web/src/features/case-opening/CaseOpening.tsx`
- `apps/web/src/features/case-opening/useCaseOpening.ts`
- `apps/web/src/features/share/ShareDialog.tsx` + `.module.css`
- `apps/web/src/features/share/SharedCasePage.tsx` + `.module.css`

## Requirements

### C1 — One share snapshot state
Today `CaseOpening` keeps three pieces of state for one thing: `shareDialogOpen`, `shareDecision` and `shareResult`.
- **Replace them with one state:**
  - `shareSnapshot: { decision: DecisionDraftData; result: SelectionResultData } | null`
  - The dialog is open exactly when `shareSnapshot !== null`.
- **Opening and closing:**
  - `openShareDialog` sets the snapshot.
  - `closeShareDialog` sets it to `null` and keeps the existing focus return to `#case-share-toggle`.
- **Rendering:** render `ShareDialog` when the snapshot is not null, passing `shareSnapshot.decision` and `shareSnapshot.result`.
- `share` (the created link) stays a separate state.

### C2 — `ShareDialog`
**Lifetime type:**
- Delete the local `ShareLifetime` type.
- Use the domain's type, `SharedCaseCreateData['lifetime']`.
- The `lifetimeOptions` list stays.

**Stale-response guard:**
- Remove `activeRef` and its effect logic.
- Keep only `requestRef`: the unmount cleanup increments it, and the create handler compares the request id.
- The copy handler needs no guard. Setting state after unmount is a no-op in React 19.

**Link field:**
- Remove the `data-share-link` attribute and the two `document.querySelector` calls.
- Give the `TextField` an `id` from `useId()`.
- On copy failure, look the field up **once** with `document.getElementById(linkFieldId)`, then focus and select it.

**Spacing:**
- Step 2 leaves a large empty band under the status line, especially on desktop.
- Render the status `<p>` only when it has a message, keeping `role="status"` on it.
- Remove its `min-height`.
- The dialog's bottom spacing then comes from `.content` and the `Sheet` body padding only.
- Check that the step 1 and step 2 bottoms look the same.

### C3 — Small simplifications
**`useCaseOpening.open`:**
- Replace the `let spinSeed` block with `const spinSeed = seed ?? crypto.getRandomValues(new Uint32Array(1))[0];`.
- Keep the `undefined` check for the strict index type.
- Behaviour is unchanged.

**`CaseOpening` imports:**
- Group the imports like the rest of the file.
- External packages first, then `components/ui`, `i18n` and `lib/api`. Then sibling `./` modules, then `../share/ShareDialog`.

**`SharedCasePage` latest result:**
- Render it as **one** `<p className={styles.latestResult}>`, with no wrapper `<div>`.
- Delete the `.latestResult p { display: inline; }` rule.

### L1 — Wide stage on desktop
The case screen widens its column to `--content-wide-max-width` from `48rem`. The public page stays at `--content-max-width`, so on desktop its strip shows only about three cells.
- **From `48rem`:** the public page's `.content` uses `width: min(100%, var(--content-wide-max-width))`, like `CaseOpening.module.css`.
- **The narrow column** (`--content-max-width`, centred) still applies to:
  - the latest result line
  - the result panel
  - the actions
  - the option list
- Only the stage uses the full wide width, as on the case screen.

### L2 — Option list style
The owner asked for lighter list lines in 6-3. The public option list uses a bordered box per option, which is heavier than the history list.
- **One container:**
  - Render the list inside **one** `Card` with `tone="surface"`, with `overflow: hidden` and no padding.
  - Use the same divider as `HistoryList.module.css`: `.item + .item` with a top border of `var(--border-width-hairline) solid var(--color-divider)`.
- **Each row:**
  - padding `var(--space-3) var(--space-4)`
  - at least `--tap-target-min` tall
  - centred items
- **Emoji:**
  - Render the emoji `<span>` only when the option has an emoji. Today an empty span still adds a gap before the label.
- Labels still wrap, with no horizontal scroll at 360 px.
- No hover or active styles, because the rows are not interactive.

## Acceptance criteria
- [ ] Sharing, reopening, closing (`Esc`, backdrop, "Đóng") and focus return behave exactly as before. Spins after sharing still make one `POST …/spins` each.
- [ ] Step 2 of the dialog has no empty band under the button when there is no status message. The copy-failure message still appears and selects the link.
- [ ] `/s/:id` at 1280 px:
  - the strip is as wide as on the case screen
  - the text, the actions and the option list stay in the narrow column
- [ ] At 360 px there is no horizontal scroll.
- [ ] The option list is one card with hairline dividers, and an option without an emoji has no leading gap.
- [ ] `git grep -n "activeRef\|data-share-link\|shareDecision\|shareResult\|shareDialogOpen" -- apps/web/src` is empty.
- [ ] `make check` passes: domain 48, api 41. Lockfile unchanged.

## Validation
```bash
make check
git grep -n "activeRef\|data-share-link\|shareDecision\|shareResult\|shareDialogOpen" -- apps/web/src
git diff HEAD~1 --name-only -- apps/web/src | grep -v "\.ts$" | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px|style=" --
git diff --stat HEAD~1
```
- The literal grep must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Stay on `feat/6-5a-share-ui`.
- Make one commit: `refactor(web): simplify share state and widen the public stage`.
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check:
   - the share dialog on a phone width and on desktop
   - `/s/:id` on desktop (wide strip) and on a phone (option list)
