# HANDOFF 5-3 — Saved decisions: preview, case, Home list, delete

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-010**, **D-019**, **D-028** and **D-029** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

The integration branch `feat/phase-5-builder` already has:
- **API (5-1)** — `GET /api/decisions` (most recently updated first), `GET/PUT/DELETE /api/decisions/:id` and `POST /api/decisions`.
  - Every mutation, **including a body-less `DELETE`**, must send `Content-Type: application/json`. The browser sends `Origin` itself.
  - `DELETE` returns 204 with no body.
- **Builder (5-2)**:
  - `/decisions/new` and `/decisions/:id/edit` (`features/builder/`)
  - the API client `lib/api/decisions.ts`, with `ensureSession()` and a single retry after a 401 `session_required`
  - a create currently lands on `/decisions/:id/edit`, with `state: { record }`
- **Preset flow (Phase 4)**:
  - `/presets/:slug` is the preview: switches whose switched-off option indexes live in `?off=`
  - `/presets/:slug/open` is the case
  - the helpers `parseOff`/`formatOff`/`applyOff` sit in `features/presets/presets.ts`

This task makes saved decisions usable. It adds:
- the decision preview `/decisions/:id`, behaving like the preset preview, plus "Sửa" and "Xóa"
- the case `/decisions/:id/open`
- a "Của bạn" section on Home with a "Tạo quyết định" card and the saved decisions
- delete with confirmation

A create in the builder now lands on the preview.

The preview and case screens for presets and saved decisions are the same UI. This task **extracts them once** and uses them for both, instead of copying.

## Scope
- C0: a builder clean-up from the 5-2 review.
- C1: the API client — `listDecisions`, `deleteDecision`.
- C2: shared preview and case pieces (`features/preview/`), adopted by the preset pages.
- C3: loading saved decisions — `useDecisionRecord` + `DecisionLoadState` (`features/decisions/`), adopted by the builder.
- C4: `/decisions/:id` preview with Sửa / Xóa.
- C5: `/decisions/:id/open` case.
- C6: the Home "Của bạn" section.
- C7: builder navigation changes.

## Out of scope (do NOT do)
- The preset "Tùy chỉnh" button and the builder "Thêm từ có sẵn" (both are 5-4).
- The position of the back link across screens, and a shared screen shell (Phase 7, owner decision).
- History, Recent decisions, sharing, sound (Phases 6 and 8).
- Pagination or search of saved decisions. Undo after delete.
- Any change to `packages/domain`, `apps/api`, Docker, tokens or dependencies.
- New UI primitives, and changes to the existing primitives' props.

## Files to create / modify
- `features/builder/formErrors.ts`, `DecisionForm.tsx`, `DecisionBuilderPage.tsx` (+ `.module.css`, delete it if it ends up empty)
- `lib/api/client.ts`, `lib/api/decisions.ts`
- `features/preview/off.ts` (new): the helpers moved from `presets.ts`
- `features/preview/DecisionPreview.tsx` + `.module.css` (new): the styles moved from `PresetPreviewPage.module.css`
- `features/preview/useOffOptions.ts` (new)
- `features/presets/presets.ts`, `PresetPreviewPage.tsx` (delete its `.module.css`), `PresetCasePage.tsx`
- `features/decisions/useDecisionRecord.ts`, `DecisionLoadState.tsx` + `.module.css` (new)
- `features/decisions/DecisionPreviewPage.tsx` + `.module.css` (new)
- `features/decisions/DecisionCasePage.tsx` (new)
- `features/decisions/useDecisionList.ts` (new)
- `features/home/HomePage.tsx` + `.module.css`
- `app/App.tsx`, `i18n/vi.ts`

All paths are under `apps/web/src/`.

## Requirements

### C0 — Builder clean-up
- `formErrors.ts`: remove the never-read `FormErrors.form` field and the branches that only set it. The status line already derives "form invalid" from `parsed.success`.

### C1 — API client
- **`client.ts`:** add `apiDelete(path: string): Promise<void>`.
  - It sends method `DELETE`, `credentials: 'same-origin'` and `Content-Type: application/json`, with no body.
  - It uses the existing shared error parser for non-OK responses and returns nothing on 204.
- **`decisions.ts`:**
  ```ts
  export function listDecisions(signal?: AbortSignal): Promise<DecisionRecordData[]>;
  export function deleteDecision(id: string): Promise<void>;
  ```
  - Both go through the same `ensureSession()` + `withSession` path as the existing functions.
  - `listDecisions` parses `DecisionListResponse` and returns `.decisions`.

### C2 — Shared preview and case (`features/preview/`)
1. **`off.ts`:**
   - Move `parseOff`, `formatOff` and `applyOff` out of `presets.ts` **unchanged**, and update the imports.
   - `presets.ts` keeps only the preset data and `findPreset`.
2. **`useOffOptions(options)`:**
   - It reads `?off=` with `useSearchParams` and returns `{ options, offKey, search }`:
     - `options`: `applyOff(...)`, **memoized** on the formatted `off` string and the input options
     - `offKey`: `formatOff(off)`
     - `search`: the current search string, `''` or `?…`
   - `PresetCasePage` uses it instead of its inline `useMemo`.
3. **`DecisionPreview`:**
   - The body of today's `PresetPreviewPage`, moved and made data-agnostic. Props:
     ```ts
     type DecisionPreviewProps = {
       title: string;
       emoji?: string;          // header emoji; omitted for saved decisions
       options: readonly DecisionOptionData[];
       backTo: string;
       openTo: string;          // path of the case route, without search
       openState?: unknown;     // router state passed when opening the case
       children?: ReactNode;    // extra actions rendered below the open button
     };
     ```
   - It keeps exactly today's behaviour and look:
     - the switches
     - `?off=` written with `replace`
     - the 2-option minimum, with the switches disabled and the hint
     - "Mở case" navigating to `openTo + search` with `state: openState` (a push)
   - `PresetPreviewPage` becomes a thin wrapper: find the preset or render `<NotFoundPage />`, set `<title>`, render `<DecisionPreview … />`.
   - **Move** the CSS from `PresetPreviewPage.module.css` into `DecisionPreview.module.css`, then delete the old file.
   - The preset preview must look and behave **exactly** as before. Compare it in the browser at 360 px and 1280 px.

### C3 — Loading a saved decision (`features/decisions/`)
1. **`useDecisionRecord(id: string | undefined)`** returns:
   ```ts
   | { status: 'loading' }
   | { status: 'loaded'; record: DecisionRecordData }
   | { status: 'notFound' }
   | { status: 'error'; retry: () => void }
   ```
   - **Initial record:**
     - If `location.state.record` passes `DecisionRecord.safeParse` and its `decision.id === id`, start in `loaded` with it.
     - Otherwise start in `loading`.
   - **Always fetch** `fetchDecision(id)` once per `id` (with an `AbortController`), **also when a state record exists**: that record may be stale, e.g. after an edit and then browser Back to an older history entry.
     - Success → `loaded` with the fetched record.
     - 404 → `notFound`, even when a state record existed (the decision was deleted).
     - Any other error: keep `loaded` if there was a state record (offline still works, rule 5), otherwise `error` with `retry`.
   - Use this logic once, here. Move the load-state code out of `DecisionBuilderPage`.
2. **`DecisionLoadState`:** renders the non-loaded states, moving the markup and CSS out of `DecisionBuilderPage`:
   - `loading` → the muted `t('loading')`
   - `notFound` → `<NotFoundPage />`
   - `error` → `t('loadFailed')` + `Button` `t('retry')`
3. **`DecisionBuilderPage`** (edit) uses both.
   - Keep `key={id}` on the form, so a background refetch that lands after mount does not reset the user's edits. The form only reads `initial` on mount.
   - Delete `DecisionBuilderPage.module.css` if nothing is left in it.

### C4 — Decision preview (`DecisionPreviewPage`, route `/decisions/:id`)
- `useDecisionRecord(id)`. The non-loaded states render `DecisionLoadState`.
- When loaded:
  - `<title>`: `{decision title} · PIKO`
  - render:
    ```tsx
    <DecisionPreview
      title={decision.title}
      options={decision.options}
      backTo="/"
      openTo={`/decisions/${id}/open`}
      openState={{ record }}
    >
      {actions}
    </DecisionPreview>
    ```
- **Actions row** (the children), centred under "Mở case":
  - **"Sửa":** a router `Link` to `/decisions/${id}/edit`, with `state: { record }`.
  - **"Xóa":** a `<button>`.
  - Both are bold, text-style actions, at least `--tap-target-min` tall, with the global focus ring.
    - "Sửa" uses `--color-text-accent`.
    - "Xóa" uses `--color-danger`.
    - Style them in `DecisionPreviewPage.module.css`; do not add a primitive.
- **Delete confirmation** (inline, no dialog):
  - "Xóa" replaces the actions row with a confirm row:
    - the text `t('deleteConfirm')`
    - an outline `Button` `t('cancel')`
    - a confirm `<button>` `t('delete')` with `background: var(--color-danger)` and `color: var(--color-on-primary)` (white on red-700 passes AA), plus the chunky border/radius tokens used by `Button`
  - Focus moves to "Hủy" when the row opens. "Hủy" restores the actions row and focuses "Xóa".
  - **Confirm:**
    - Disable both buttons and label the confirm `t('deleting')`.
    - Call `deleteDecision(id)`.
    - On success **or a 404** (already gone), `navigate('/', { replace: true })`.
    - On any other error, show `t('deleteFailed')` with `role="alert"` and re-enable the buttons.

### C5 — Decision case (`DecisionCasePage`, route `/decisions/:id/open`)
- `useDecisionRecord(id)` + `DecisionLoadState`, like C4.
- When loaded: `useOffOptions(decision.options)`, then:
  ```tsx
  <CaseOpening
    key={`${id}?${offKey}`}
    title={decision.title}
    options={options}
    backTo={`/decisions/${id}${search}`}
  />
  ```
  with `<title>` `{decision title} · PIKO`.
- Call the hooks before any early return. Pass an empty list to `useOffOptions` while not loaded.

### C6 — Home "Của bạn" (`HomePage` + `useDecisionList`)
- **`useDecisionList()`:** calls `listDecisions` on mount (abortable) and returns `{ status: 'loading' | 'loaded' | 'error', decisions }`.
- **The section:**
  - It is placed **between** `ModeSelector` and "Chọn nhanh", with `<h2>` `t('yourDecisions')`.
  - It uses the same list grid as the preset cards (`presetList`, including its wide-screen columns).
- **First item: a "Tạo quyết định" card.**
  - A `Link` to `/decisions/new`, inside a `Card` tone `surface` with a **dashed** border (a local class: `border-style: dashed`).
  - It shows a `+` (`aria-hidden`) and `t('builderNewTitle')`.
  - It uses the same hover/press states as the preset cards.
- **Then one card per saved decision**, in API order:
  - a `Link` to `/decisions/${id}` with `state: { record }`, `Card` tone `surface`
  - the title
  - a hint listing the first three option labels, followed by `…` only when there are more than three
  - the emoji of the first option that has one, if any
  - Reuse the preset card classes. Keep the existing hover/press order: `:active` after the hover media block.
- **States:**
  - while loading, only the create card shows (no skeleton, no spinner)
  - on an error, the create card plus a muted `t('listFailed')` below the grid; Home stays fully usable
  - with no decisions, only the create card shows

### C7 — Builder navigation
- **After a successful create:** `navigate(`/decisions/${record.decision.id}`, { replace: true, state: { record } })`. The builder's `/new` entry is replaced, so Back from the preview goes to wherever the user came from (Home).
- **After a successful update:** unchanged. It stays on `/edit`, replaces the state and shows "Đã lưu".
- **The builder back link:** `/decisions/${decisionId}` when editing, `/` when creating.

### Routes (`App.tsx`)
```tsx
<Route path="/decisions/new" element={<DecisionBuilderPage />} />
<Route path="/decisions/:id" element={<DecisionPreviewPage />} />
<Route path="/decisions/:id/edit" element={<DecisionBuilderPage />} />
<Route path="/decisions/:id/open" element={<DecisionCasePage />} />
```
`/decisions/new` must keep matching the builder. React Router ranks static segments first; verify it.

### i18n (`vi.ts`)
Add:
```ts
yourDecisions: 'Của bạn',
listFailed: 'Chưa tải được quyết định của bạn.',
edit: 'Sửa',
delete: 'Xóa',
deleteConfirm: 'Xóa quyết định này?',
cancel: 'Hủy',
deleting: 'Đang xóa…',
deleteFailed: 'Chưa xóa được. Thử lại sau.',
```
Remove any key that becomes unused; check each one with `git grep`.

### Conventions
- Tokens only: no raw color, duration, shadow, z-index or px literals.
- No inline `style` attributes.
- Animate only `transform`/`opacity`.
- Grid items with text get `min-width: 0`. Long titles and labels wrap.
- No weights, percentages or odds anywhere (D-010).

## Acceptance criteria
- [ ] The preset preview and case look and behave exactly as before (`?off=`, the 2-option minimum, Back keeps the switches). The preset pages contain no copied preview markup.
- [ ] **Home:**
  - "Của bạn" shows the create card first, then the saved decisions, most recently updated first
  - it shows only the create card when empty or loading
  - an API error shows `listFailed` and keeps the presets usable (check with `docker compose -f compose.dev.yaml stop api`, then restart it)
- [ ] **Create:**
  - builder → Lưu → `/decisions/:id` (preview), with no loading flash
  - Back → Home, not the builder
- [ ] **Preview → Mở case → case:**
  - only the switched-on options can win
  - Back → the preview with the same switches
- [ ] **Preview → Sửa → edit, save, then browser Back to the preview:** the preview shows the **edited** title after the background refetch.
- [ ] **Delete:**
  - Xóa → confirm row with focus on Hủy; Hủy → back, with focus on Xóa
  - confirm → Home, and the card is gone
  - deleting an already-deleted decision also lands on Home
- [ ] `/decisions/<random uuid>`, `/decisions/abc` and `/decisions/<random uuid>/open` show Not found. `/decisions/new` still opens the builder.
- [ ] No horizontal overflow at 360 px and 1280 px on Home (with a saved decision whose title is 60 characters) and on the decision preview. Check element geometry.
- [ ] `make check` passes. No new dependency.
- [ ] Prod main JS gzip is reported, built with `NODE_ENV=production`.

## Validation
Run and include the output in the report:
```bash
make check
git grep -n "parseOff\|formatOff\|applyOff" -- apps/web/src
git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px|style=" -- apps/web/src/features apps/web/src/app
git diff --stat feat/phase-5-builder...HEAD
docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c 'pnpm --filter @piko/web build' | grep "\.js"
```
- The first grep must show definitions only in `features/preview/off.ts`.
- The second grep must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/5-3-saved-decisions` from **`feat/phase-5-builder`**.
- Use small logical commits, e.g.:
  - `refactor(web): share the decision preview and off helpers`
  - `feat(web): load saved decisions with a shared hook`
  - `feat(web): add saved decision preview, case and delete`
  - `feat(web): list saved decisions on Home`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including the geometry check and the prod bundle size
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check at `localhost:5173`:
   - Home "Của bạn" on phone and desktop
   - create → preview → open case → Back
   - edit, then Back to the preview
   - delete with confirmation
   - the preset flow unchanged
