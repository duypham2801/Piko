# HANDOFF 5-2 — Decision builder (create and edit)

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-010**, **D-019**, **D-024**, **D-028** and **D-029** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

5-1 added the decisions API (on the integration branch `feat/phase-5-builder`):

| Method | Path | Result |
|---|---|---|
| `GET` | `/api/decisions/:id` | `DecisionRecord` |
| `POST` | `/api/decisions` | 201 `DecisionRecord` |
| `PUT` | `/api/decisions/:id` | 200 `DecisionRecord` |

- The domain exports `DecisionDraft` / `DecisionDraftData` (a decision without `id`), `DecisionRecord` / `DecisionRecordData` (`{ decision, createdAt, updatedAt }`) and `DECISION_LIMITS`.
- API errors use the `ApiError` shape `{ error: { code, message } }`. Codes used here:
  - `session_required` (401)
  - `not_found` (404)
  - `invalid_body` / `invalid_json` (400)
  - `decision_limit_reached` (409)
- The decision routes **never create a guest session**. The web must `await ensureSession()` first (rule 12), and on a 401 `session_required` it must reset and re-create the session, then retry once.
- Mutations must be `Content-Type: application/json`. The browser sends `Origin` itself.

This task builds the builder screen: create and edit a decision, validate it with the shared schema, save it explicitly, and open the case with the current draft without saving.

The decision preview page (`/decisions/:id`), the Home "Của bạn" list, delete and the preset "Tùy chỉnh" button are **5-3**. Until then, the owner reaches the builder by URL.

## Scope
- B1: API client — `POST`/`PUT`/`GET` for decisions, with the 401 retry.
- B2: Routes `/decisions/new` and `/decisions/:id/edit`, plus loading the record for edit.
- B3: The builder form: title, options (add, edit, remove), emoji picker, priority dots.
- B4: Validation with `DecisionDraft`, with Vietnamese messages per field.
- B5: Save, and the save states.
- B6: "Mở case" from the builder, with the current draft, in place.

## Out of scope (do NOT do)
- `/decisions/:id` (preview), `/decisions/:id/open`, the Home list or CTA, delete, `?from=<preset>` (all 5-3).
- An enabled/disabled toggle per option, a category field, drag-and-drop reordering, an unsaved-changes prompt, autosave, local drafts in storage.
- Any change to `packages/domain`, `apps/api`, Docker or the existing UI primitives' APIs.
- New dependencies or new tokens.

## Files to create / modify
- `apps/web/src/lib/api/client.ts`: a shared request helper (see B1)
- `apps/web/src/lib/api/decisions.ts` (new)
- `apps/web/src/app/App.tsx`: routes
- `apps/web/src/features/builder/` (new):
  - `DecisionBuilderPage.tsx` + `.module.css`
  - `DecisionForm.tsx` + `.module.css`
  - `EmojiPicker.tsx` + `.module.css`
  - `PriorityDots.tsx` + `.module.css`
  - `emojis.ts`
  - `formErrors.ts`
  - Split `OptionRow.tsx` out of `DecisionForm` only if the form file grows past about 250 lines.
- `apps/web/src/i18n/vi.ts`

## Requirements

### B1 — API client
- **`client.ts`:** add `apiSend<T>(method: 'POST' | 'PUT', path: string, body: unknown, schema: ZodMiniType<T>): Promise<T>`.
  - It sends JSON with `Content-Type: application/json` and `credentials: 'same-origin'`.
  - It shares the error handling with `apiGet`: move the "non-OK response → `ApiClientError`" code into one private function used by both. Do not copy it.
- **`decisions.ts`:**
  ```ts
  export function fetchDecision(id: string): Promise<DecisionRecordData>;
  export function createDecision(draft: DecisionDraftData): Promise<DecisionRecordData>;
  export function updateDecision(id: string, draft: DecisionDraftData): Promise<DecisionRecordData>;
  ```
  - Each one first does `await ensureSession()`.
  - Each one runs through one local helper, e.g. `withSession(request)`. When the request throws an `ApiClientError` with status 401 and code `session_required`, the helper calls `resetSession()`, then `await ensureSession()`, and retries **once**.
  - Responses are parsed with `DecisionRecord`.
  - Encode `id` with `encodeURIComponent` in the path.

### B2 — Routes and loading (`DecisionBuilderPage`)
```tsx
<Route path="/decisions/new" element={<DecisionBuilderPage />} />
<Route path="/decisions/:id/edit" element={<DecisionBuilderPage />} />
```
- **New:** render `<DecisionForm key="new" initial={emptyDraft()} />`.
  - `emptyDraft()` returns a title of `''` and **two** empty options.
  - Each option has id `crypto.randomUUID()`, label `''`, no emoji, weight `DECISION_LIMITS.weightDefault` and `enabled: true`.
- **Edit:**
  - If `location.state` holds a `record` that passes `DecisionRecord.safeParse` and whose `decision.id` equals the `:id` param, use it directly, with the initial save status "saved". This is how B5 hands over after a create.
  - Otherwise fetch it with `fetchDecision(id)`, with an `AbortController` cleaned up in the effect. The states are:
    - loading: a muted `t('loading')` in the screen layout
    - 404 → `<NotFoundPage />`
    - any other error: `t('loadFailed')` plus a `Button` `t('retry')`
    - loaded → `<DecisionForm key={id} decisionId={id} initial={draftOf(record)} />`
  - `draftOf` copies `title`, `category` (kept as is, with no UI) and `options` from `record.decision`, without `id`.
- `<title>`: `t('builderNewTitle')` or `t('builderEditTitle')`, then ` · PIKO`.

### B3 — Form layout (`DecisionForm`)
- Use the screen and column pattern of `PresetPreviewPage`: cream background, a `--content-max-width` column, token spacing. Keep one column at every width.
- From top to bottom:
  1. `<BackLink to="/">{t('back')}</BackLink>`
  2. `<h1>`: `t('builderNewTitle')` or `t('builderEditTitle')`
  3. `TextField`:
     - label `t('decisionTitleLabel')`
     - placeholder `t('decisionTitlePlaceholder')`
     - `maxLength={DECISION_LIMITS.titleMaxLength}`
     - the error from B4
  4. `<h2>` `t('optionsHeading')`, then a `<ul>` with one `Card` (surface) per option, in order.
  5. An outline `Button` `t('addOption')`. It is disabled at `DECISION_LIMITS.maxOptions`, and then a muted hint `t('maxOptionsHint')` shows.
  6. A **sticky action bar** at the bottom of the column:
     - `position: sticky; bottom: 0`
     - `background: var(--color-bg)`
     - `z-index: var(--z-raised)`
     - bottom padding includes `env(safe-area-inset-bottom)`
     - two buttons, equal width: secondary `t('openCase')` and primary `t('save')`
     - the save status line (B5) sits directly above the buttons
- **Option row** (one `Card`):
  - Line 1, a grid `auto minmax(0, 1fr) auto`:
    - the emoji button (B3a)
    - a `TextField` with `hideLabel`:
      - label `` `${t('optionLabel')} ${index + 1}` ``
      - placeholder `t('optionPlaceholder')`
      - `maxLength={DECISION_LIMITS.labelMaxLength}`
      - its error
    - a remove button: a plain `<button>` showing `×`
      - `aria-label` `` `${t('removeOption')} ${index + 1}` ``
      - at least `--tap-target-min` square
      - disabled at `DECISION_LIMITS.minOptions`
  - Line 2: a muted small label `t('priority')` and `PriorityDots` (B3b).
  - The emoji panel (B3a) opens below both lines, across the full row width.
- **Adding an option** appends an empty option with a new `crypto.randomUUID()` and focuses its label input.
- **Removing an option** moves focus to the label input that now holds that index. If the removed option was the last one, focus the new last option's input.
- Rows may contain long labels: grid items with text need `min-width: 0`. There must be no horizontal overflow at 360 px.

#### B3a — `EmojiPicker` and `emojis.ts`
- `emojis.ts` exports exactly this list, in this order (40 emoji):
  ```
  🍜 🍕 🍔 🍣 🍱 🥗 🍗 🥖 🌮 🍲
  ☕ 🧋 🍵 🥤 🍺 🍷 🧃 🍹
  🏠 🏞️ 🏖️ 🛍️ 🎬 🏟️ 🏛️ ⛰️
  🎮 🎤 📚 🏃 🚴 🏊 🎨 🎲
  🎁 ✈️ 🛌 💡 ❤️ ⭐
  ```
  - In dev only, validate each entry at module load with the domain `DecisionOption` schema (as `presets.ts` does), so every picker emoji is accepted by the API.
- **The trigger** is a button in the row:
  - it shows the option's emoji, or a muted `+` when there is none
  - `aria-label` `` `${t('chooseEmoji')} ${index + 1}` ``
  - `aria-expanded`
  - at least `--tap-target-min` square
- **At most one panel** is open in the whole form. The form holds the open option id.
- **The panel:**
  - a labelled `role="group"` with a grid of emoji buttons, each with `aria-pressed` for the current choice
  - a first button `t('noEmoji')`, which removes the emoji
- **Behaviour:**
  - choosing a button sets the emoji, closes the panel and returns focus to the trigger
  - `Escape` inside the panel closes it and returns focus to the trigger
- Use tokens only. The selected emoji gets a visible ring (`--color-focus-ring` or `--color-primary` border), not just a color fill.

#### B3b — `PriorityDots`
- Five native radios inside a `fieldset`:
  - the `legend` is visually hidden: `` `${t('priority')} — ${label || `${t('optionLabel')} ${index + 1}`}` ``
  - each radio's accessible name is `` `${t('priorityLevel')} ${n}` ``
  - `name` is unique per option
- **Visual:** dot `n` is filled when `n ≤ weight`, and outlined otherwise.
  - Draw the dots with CSS on a sibling element of a `visually-hidden` input, the same technique as `ModeSelector`.
  - The visible dot can be small, but each label's hit area is at least `--tap-target-min` tall.
  - Keyboard focus shows the global focus ring on the dot of the focused radio.
- Selecting `n` sets `weight = n`. Arrow keys work natively.
- **D-010:** never show a number, a percentage or the word "tỉ lệ" next to the dots. Use no rarity colors: one color for filled dots.

### B4 — Validation (`formErrors.ts` + form)
- The form state is a `DecisionDraftData`-shaped object holding the raw input strings. Validate with `DecisionDraft.safeParse(state)`.
- **When errors show:** only after the first "Lưu" or "Mở case" attempt (a `submitted` flag). From then on, they update live on every change.
- **Mapping** (`formErrors.ts`, a pure function from the zod issues and the state to `{ title?: string; options: Record<optionId, string>; form?: string }`):
  - path `['title']`: `too_small` → `t('titleRequired')`, `too_big` → `t('titleTooLong')`
  - path `['options', i, 'label']`: `too_small` → `t('optionRequired')`, `too_big` → `t('optionTooLong')`
  - **duplicate labels:** do not rely on the `duplicate_option_label` issue, because zod skips refinements while any field is invalid (see the 2-1 review note).
    - Compute duplicates in `formErrors.ts`: `label.normalize('NFC').trim().toLocaleLowerCase('vi')`, ignoring empty labels.
    - Put `t('optionDuplicate')` on **every** row in a duplicate group, unless that row already has a field error.
  - any other issue → `form: t('formInvalid')`
- On a failed attempt:
  - focus the first invalid input in visual order (the title, then the option labels)
  - show `t('formInvalid')` in the status line, `role="alert"`

### B5 — Save
- "Lưu":
  1. validate (B4)
  2. if valid, call `createDecision(parsed.data)` when there is no `decisionId`, otherwise `updateDecision(decisionId, parsed.data)`
  3. send the **parsed** draft: normalized and trimmed
- **Status line** (one element above the buttons; `role="status"` except for errors):

  | State | Display |
  |---|---|
  | idle | nothing |
  | saving | the Save button is disabled and labelled `t('saving')` |
  | saved | `t('saved')` |
  | error, `decision_limit_reached` | `t('saveLimit')`, `role="alert"` |
  | any other error, including a network failure | `t('saveFailed')`, `role="alert"` |

  - Any edit after "saved" clears the status back to idle.
  - Errors never block editing or "Mở case".
- **After a successful create:**
  - `navigate(`/decisions/${record.decision.id}/edit`, { replace: true, state: { record } })`
  - B2 then shows the edit form with "saved", and Back does not return to an empty `/decisions/new`.
  - 5-3 will change this target to the decision preview.
- **After a successful update:** stay on the page, and set the form state from the returned record (normalized values).

### B6 — Open the case from the builder
- "Mở case" validates (B4). If valid, it sets the search param `view=case` with a **push** (`setSearchParams`), so browser Back returns to the form.
- While `view=case` and the draft is valid, `DecisionForm` renders, instead of the form:
  ```tsx
  <CaseOpening title={parsed.data.title} options={caseOptions} backTo={location.pathname} />
  ```
  - Memoize `caseOptions` (`useMemo`) on the parsed options, because `useCaseOpening` rebuilds when the options change identity.
  - The form component stays mounted while the case shows, so the draft and its unsaved edits survive Back.
- With `view=case` and an invalid or empty draft (e.g. a reload of `/decisions/new?view=case`), show the form and remove the param with `replace`.
- This works without the network: saving is never required to open the case (rule 5, D-029).

### i18n (`vi.ts`)
Add exactly these keys (number-free copy, so it cannot drift from `DECISION_LIMITS`):
```ts
builderNewTitle: 'Tạo quyết định',
builderEditTitle: 'Sửa quyết định',
decisionTitleLabel: 'Tiêu đề',
decisionTitlePlaceholder: 'Ví dụ: Tối nay ăn gì?',
optionsHeading: 'Các lựa chọn',
optionLabel: 'Lựa chọn',
optionPlaceholder: 'Ví dụ: Phở bò',
addOption: 'Thêm lựa chọn',
removeOption: 'Xóa lựa chọn',
maxOptionsHint: 'Đã đủ số lựa chọn tối đa.',
chooseEmoji: 'Chọn emoji cho lựa chọn',
noEmoji: 'Không emoji',
priority: 'Độ ưu tiên',
priorityLevel: 'Mức',
save: 'Lưu',
saving: 'Đang lưu…',
saved: 'Đã lưu',
saveFailed: 'Chưa lưu được. Kiểm tra mạng rồi thử lại — bạn vẫn có thể mở case.',
saveLimit: 'Bạn đã lưu tối đa số quyết định. Xóa bớt để lưu thêm.',
titleRequired: 'Nhập tiêu đề.',
titleTooLong: 'Tiêu đề quá dài.',
optionRequired: 'Nhập lựa chọn.',
optionTooLong: 'Lựa chọn quá dài.',
optionDuplicate: 'Lựa chọn này bị trùng.',
formInvalid: 'Kiểm tra lại các ô được đánh dấu.',
loading: 'Đang tải…',
loadFailed: 'Không tải được quyết định.',
retry: 'Thử lại',
```

### Conventions
- Tokens only: no raw color, duration, shadow, z-index or px size literals in CSS. The `1fr`/`minmax`/`%` layout values are fine.
- Animate only `transform`/`opacity`. No inline `style` attributes.
- Reuse the primitives `Button`, `TextField`, `Card` and `BackLink`. Do not change their props.
- Contrast rules from CLAUDE.md: no white text on teal or lemon.
- No percentages, odds or weight numbers anywhere (D-010).

## Acceptance criteria
- [ ] `/decisions/new` starts with an empty title and two empty options.
  - Add up to 20 options; the add button then disables and the hint shows.
  - You cannot remove below 2 options.
  - Focus moves as specified when adding and removing.
- [ ] Emoji picker:
  - one panel at a time
  - choosing an emoji or "Không emoji" closes the panel and returns focus to the trigger
  - `Escape` closes it
  - all 40 emoji pass the dev schema check
- [ ] Priority dots:
  - five radios per option, operable by keyboard, with visible focus
  - the filled dots match the weight
  - no numbers or percentages are shown
- [ ] Validation:
  - no errors before the first attempt
  - after it, the errors are per field and update live
  - duplicate labels (e.g. "Phở" and " phở ") mark both rows, even while another field is empty
  - focus goes to the first invalid input
- [ ] Save:
  - a create goes to `/decisions/<id>/edit`, showing "Đã lưu", with no loading flash
  - Back does not return to an empty `/decisions/new`
  - an update stays on the page and shows "Đã lưu"
  - an edit clears the status
- [ ] With the api container stopped (`docker compose -f compose.dev.yaml stop api`):
  - Save shows `saveFailed`
  - "Mở case" still opens the case with the draft
  - Back returns to the form with the edits intact
  - Restart the api afterwards.
- [ ] A 401 `session_required` is retried once after resetting the session. Check this by deleting the `piko_sid` cookie in DevTools, then saving: it succeeds, under a new guest.
- [ ] `/decisions/<random uuid>/edit` and `/decisions/abc/edit` show Not found.
- [ ] No horizontal overflow at 360 px and 1280 px, including a row with a 40-character label and an open emoji panel. Check element geometry, not only `scrollWidth`.
- [ ] `make check` passes. No new dependency, and the lockfile is unchanged.

## Validation
Run and include the output in the report:
```bash
make check
git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px" -- apps/web/src/features/builder
git grep -n "style=" -- apps/web/src/features/builder
git diff --stat feat/phase-5-builder...HEAD
```
- Both greps must return nothing.
- Report the main JS gzip size from `pnpm --filter @piko/web build` (inside the dev container) compared with `feat/phase-5-builder`.
- After switching branches, run `docker compose -f compose.dev.yaml restart web` (see `docs/ENVIRONMENTS.md`).

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/5-2-decision-builder` from **`feat/phase-5-builder`**.
- Use small logical commits, e.g.:
  - `feat(web): add decisions API client with session retry`
  - `feat(web): add decision builder form`
  - `feat(web): add emoji picker and priority dots`
  - `feat(web): open the case from the builder draft`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including the geometry check at 360 px and 1280 px and the bundle size
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check at `localhost:5173/decisions/new`:
   - creating a decision on phone and desktop widths
   - the emoji picker and the priority dots
   - the validation messages
   - Save, then edit and save again
   - "Mở case" from the builder, then Back
   - Save with the api stopped
