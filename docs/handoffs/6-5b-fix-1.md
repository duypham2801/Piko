# HANDOFF 6-5b-fix-1 — Simpler revoke handling

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

6-5b (the two implementer commits on `feat/6-5b-shared-links`) added "Link đã chia sẻ" with revoke in `/history`. The architect reviewed it, and the behaviour is correct:
- **Checks:** `make check` passes (domain 48, api 41). The greps are clean.
- **Requests:** `/history` makes `/api/me`, then `GET /api/history` and `GET /api/shares`.
- **Revoke:**
  - It makes one `DELETE` and the row disappears.
  - `/s/<id>` then shows "Link này không còn khả dụng".
- **Focus:**
  - Focus moves to "Hủy", and back to "Thu hồi" on cancel.
  - After a revoke it lands on "Link đã chia sẻ", or on "Đã chọn" after the last one.
- **Errors:**
  - With the api stopped, the row shows `revokeFailed` and both sections show their errors.
  - It works again after the api restarts.

What remains is more code than the behaviour needs, in two places.

## Scope
- C1: `SharedLinkList` revoke handler.
- C2: focus after a revoke in `HistoryPage`.

## Out of scope (do NOT do)
- Any change in behaviour, requests, copy or styles.
- `Button`, `DecisionPreviewPage`, `useShareList`, `lib/api/shares.ts`, `packages/domain`, `apps/api`, dependencies.

## Files to modify
- `apps/web/src/features/share/SharedLinkList.tsx`
- `apps/web/src/features/history/HistoryPage.tsx`

## Requirements

### C1 — `SharedLinkList`
**Remove the mounted guard:**
- Remove `mountedRef` and its effect.
- Setting state after unmount is a no-op in React 19. 6-5a-fix-1 removed the same guard from `ShareDialog`.

**One success path.** Write `handleRevoke` with a single success path:
```ts
try {
  await revokeShare(id);
} catch (error: unknown) {
  if (!(error instanceof ApiClientError && error.status === 404)) {
    setRevokingId(null);
    setErrorId(id);
    return;
  }
}
setRevokingId(null);
setConfirmingId(null);
onRevoked(id);
```
A `404` still counts as revoked, as before. Keep the `revokingId !== null` early return.

### C2 — `HistoryPage` focus after a revoke
Today `HistoryPage` sets a `focusAfterRevokeRef` flag, then an effect watches `shares` and `sharesStatus` to move the focus.
- **Remove** the flag and the effect.
- **`handleRevoked(id)`:**
  - Compute whether rows remain: `shares.length > 1`.
  - Call `removeShare(id)`.
  - Then `requestAnimationFrame(() => (rowsRemain ? sharedLinksHeadingRef : historyEntriesHeadingRef).current?.focus())`.
- Keep both heading refs with `tabIndex={-1}`.
- Remove any import that becomes unused.

## Acceptance criteria
- [ ] **Revoke** with two links:
  - after the first, focus lands on "Link đã chia sẻ"
  - after the last, the section disappears and focus lands on "Đã chọn"
- [ ] **Cancel:** "Hủy" still returns focus to that row's "Thu hồi".
- [ ] **Errors:**
  - with the api stopped, the row shows `revokeFailed` and both buttons work again
  - a link already revoked in another tab disappears without an error
- [ ] `git grep -n "mountedRef\|focusAfterRevokeRef" -- apps/web/src` is empty.
- [ ] `make check` passes: domain 48, api 41. Lockfile unchanged.

## Validation
```bash
make check
git grep -n "mountedRef\|focusAfterRevokeRef" -- apps/web/src
git diff --stat HEAD~1
```
After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Stay on `feat/6-5b-shared-links`.
- Make one commit: `refactor(web): simplify shared link revoke handling`.
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), with test counts
4. Deviations from this handoff and why
5. Known issues / open questions
6. No new visual review is needed (no visual change). The owner may still check `/history` revoke on a phone.
