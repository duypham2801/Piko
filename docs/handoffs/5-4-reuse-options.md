# HANDOFF 5-4 — Reuse existing options: preset "Tùy chỉnh" and "Thêm từ có sẵn"

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-010**, **D-028** and **D-029** in `docs/DECISIONS.md`. D-029 has the sections "Customize a preset" and "Quick-add from existing options". You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

The integration branch `feat/phase-5-builder` has:
- **The builder (5-2):** `features/builder/`.
  - `DecisionBuilderPage` renders `<DecisionForm key="new" initial={emptyDraft()} />` on `/decisions/new`.
  - `draft.ts` holds `emptyOption`, `emptyDraft`, `draftOf` and `optionInputId`.
  - Duplicate labels are detected in `formErrors.ts` with `label.normalize('NFC').trim().toLocaleLowerCase('vi')`.
- **Saved decisions (5-3):**
  - `features/decisions/useDecisionList()` returns `{ status: 'loading' | 'loaded' | 'error', decisions }`, from `GET /api/decisions`
  - the preview is `features/preview/DecisionPreview`, with a `children` slot for extra actions below "Mở case"
  - `PresetPreviewPage` is a thin wrapper around it
- **Presets:** `features/presets/presets.ts`.
  - `PRESETS` is a list of `{ slug, emoji, decision }` items, and `findPreset(slug)` finds one.
  - All preset options have an emoji and weight 1.
- **The `Chip` primitive:** a toggle button with `selected` / `onSelectedChange`, `aria-pressed` and the native `disabled`.

The owner wants two ways to reuse what already exists (D-029):
1. **"Tùy chỉnh"** on a preset preview opens the builder pre-filled with that preset, to save it as the user's own decision.
2. **"Thêm từ có sẵn"** in the builder copies single options from presets and from the user's saved decisions into the draft.

Both are **copies**: new ids, no link back to the source. Nothing changes in the domain model or the API.

## Scope
- R1: `draft.ts` helpers: `normalizeLabel`, `draftFromPreset`, `withCopiedOption`.
- R2: the preset preview "Tùy chỉnh" action, and `/decisions/new?from=<slug>`.
- R3: the builder "Thêm từ có sẵn" panel (`ExistingOptionsPanel`).

## Out of scope (do NOT do)
- Linked or chained options (an option that opens another decision). That is a post-MVP idea.
- Copying weights from saved decisions, or carrying the preset preview's `?off=` switches into the builder.
- Search inside the panel, pagination, "Tùy chỉnh" or "Nhân bản" on saved decisions.
- Any change to `packages/domain`, `apps/api`, tokens, the UI primitives' props or dependencies.

## Files to create / modify
- `features/builder/draft.ts`, `formErrors.ts`
- `features/builder/DecisionBuilderPage.tsx`
- `features/builder/DecisionForm.tsx` + `.module.css`
- `features/builder/ExistingOptionsPanel.tsx` + `.module.css` (new)
- `features/presets/PresetPreviewPage.tsx` + `PresetPreviewPage.module.css` (new, a single class)
- `i18n/vi.ts`

All paths are under `apps/web/src/`.

## Requirements

### R1 — Helpers (`draft.ts`)
```ts
export function normalizeLabel(label: string): string;      // NFC, trim, toLocaleLowerCase('vi')
export function draftFromPreset(preset: Preset): DecisionDraftData;
export function withCopiedOption(
  draft: DecisionDraftData,
  source: Pick<DecisionOptionData, 'label' | 'emoji'>,
): DecisionDraftData;
```
- `formErrors.ts` uses `normalizeLabel` instead of its inline expression.
- `draftFromPreset`:
  - `title` = the preset's title; no `category`
  - every option copied in order, with a **new** `crypto.randomUUID()`, its `label` and `emoji`, `weight: DECISION_LIMITS.weightDefault` and `enabled: true`
- `withCopiedOption`:
  - If the draft has an option whose label is empty after trimming, **and** that option has no emoji, fill the **first** such option with the source's label and emoji, keeping its id and weight.
  - Otherwise append a new option: a new id, the source's label and emoji, the default weight, `enabled: true`.
  - It is pure and returns a new object. The caller guarantees the label is not already present and that `maxOptions` has not been reached.

### R2 — "Tùy chỉnh"
- **`PresetPreviewPage`** passes one child to `DecisionPreview`:
  ```tsx
  <Link className={styles.customize} to={`/decisions/new?from=${preset.slug}`}>{t('customize')}</Link>
  ```
  - `.customize` has the same text-action look as "Sửa" on the decision preview:
    - `--color-text-accent`, bold, no underline (underline on hover)
    - at least `--tap-target-min` tall, `justify-self: center`
    - the global focus ring
  - Put it in a new `PresetPreviewPage.module.css`. This is the only class there.
- **`DecisionBuilderPage` on `/decisions/new`:**
  - Read `from` with `useSearchParams` and `findPreset(from)`.
  - **With a preset:**
    - `initial` = `draftFromPreset(preset)`, memoized on the slug, so the ids stay stable across renders
    - `key={`new:${slug}`}`
    - pass `backTo={`/presets/${slug}`}`
  - **Without one, or with an unknown `from`:** today's empty draft, `key="new"`, `backTo="/"`. An unknown `from` is silently ignored; do not show Not found.
- **`DecisionForm`** gets an optional `backTo?: string` prop.
  - The back link uses `backTo ?? (decisionId ? `/decisions/${decisionId}` : '/')`.
  - Everything else is unchanged. The create flow lands on the new decision's preview, with `replace`.
- The pre-filled draft is valid at once. "Mở case" and "Lưu" both work without any edit.

### R3 — "Thêm từ có sẵn" (`ExistingOptionsPanel`)
- **Placement:**
  - Below the option list, the two buttons sit side by side and wrap on narrow screens, both outline `Button`s:
    - the existing `t('addOption')`
    - a new `t('addFromExisting')` with `aria-expanded` and `aria-controls` pointing at the panel id
  - The `maxOptionsHint` logic stays.
  - The panel renders **below the buttons** when open, and toggles with the button.
  - At most one of these is open at a time: the emoji panel or this panel. Opening one closes the other. The form already holds `openEmojiId`; close it when this panel opens, and close this panel when an emoji panel opens.
- **The panel content**, in order:
  1. a heading row: `<h3>` `t('addFromExisting')` and an outline `Button` `t('done')` that closes the panel and returns focus to the toggle button
  2. **Saved decisions** (`t('yourDecisions')`), only when there are any besides the one being edited:
     - **mount `useDecisionList()` inside the panel**, so the list is fetched only when the panel opens
     - exclude `decisionId`
     - while loading: a muted `t('loading')`
     - on an error: a muted `t('listFailed')`, and the presets still work
  3. **Presets** (`t('quickPicks')`), all of `PRESETS` in order
  
  - Each decision is a native `<details>`, closed by default:
    - `<summary>`: the decision emoji (for presets) `aria-hidden`, then the title
    - the body: a wrapping row of `Chip`s, one per option, showing `emoji label`
- **Chip state:**
  - `selected` = the draft already has an option whose `normalizeLabel(label)` matches. These chips are also `disabled`, so the same option is never added twice.
  - At `DECISION_LIMITS.maxOptions`, every unselected chip is `disabled`, and the panel shows `t('maxOptionsHint')` under its heading.
  - Tapping an unselected chip: `editDraft((current) => withCopiedOption(current, option))`. Focus stays on the chip, which now reads as selected, so the user can add several in a row.
- **Keyboard:** `Escape` inside the panel closes it and focuses the toggle button, like the emoji panel.
- **Layout:**
  - a bordered surface like the emoji panel, tokens only
  - `<details>` groups separated by `--space-2`
  - chips wrap with `gap: var(--space-2)`
  - no horizontal overflow at 360 px, even with long titles and labels (`min-width: 0`, `overflow-wrap: anywhere`)
- D-010: the chips show no weights, numbers or odds.

### i18n (`vi.ts`)
Add:
```ts
customize: 'Tùy chỉnh',
addFromExisting: 'Thêm từ có sẵn',
done: 'Xong',
```
Reuse `yourDecisions`, `quickPicks`, `loading`, `listFailed` and `maxOptionsHint`.

### Conventions
- Tokens only: no raw color, duration, shadow, z-index or px literals.
- Run the `style=` grep only on the files this task creates or modifies (see Validation). Do **not** refactor older code that a grep flags; report it instead.
- Animate only `transform`/`opacity`.

## Acceptance criteria
- [ ] **Preset preview:**
  - "Tùy chỉnh" sits under "Mở case"
  - it opens `/decisions/new?from=<slug>` with the preset title and all its options (emoji kept, weight 1)
  - Back returns to the preset preview
  - Lưu → the new decision's preview, and the card appears on Home
- [ ] `/decisions/new?from=nope` opens the empty builder without an error.
- [ ] **"Thêm từ có sẵn" on an empty new draft:**
  - the first two chips fill the two empty rows, and the third appends a row
  - added chips show as selected and disabled
  - a label typed by hand that matches a chip (e.g. " phở ") marks that chip as selected
- [ ] At 20 options, every unselected chip is disabled and the hint shows.
- [ ] Panel behaviour:
  - the panel and the emoji panel never show at the same time
  - `Escape` and "Xong" close the panel and focus the toggle
  - saved decisions are fetched only when the panel opens; check the Network panel
  - when editing, the decision being edited is not listed
- [ ] With the api stopped, the panel shows `listFailed` for saved decisions, and the presets still add options.
- [ ] No horizontal overflow at 360 px and 1280 px with the panel open and a group expanded. Check element geometry.
- [ ] `make check` passes. No new dependency.
- [ ] The prod main JS gzip is reported, built with `NODE_ENV=production`.

## Validation
Run and include the output in the report:
```bash
make check
git grep -n "normalize('NFC')" -- apps/web/src
git diff --name-only feat/phase-5-builder...HEAD -- apps/web/src | xargs git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(|[0-9]+px|style=" --
git diff --stat feat/phase-5-builder...HEAD
docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c 'pnpm --filter @piko/web build' | grep "\.js"
```
- The first grep must show only `draft.ts`.
- The second grep, which checks only the changed files, must be empty.
- After switching branches, run `docker compose -f compose.dev.yaml restart web`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/5-4-reuse-options` from **`feat/phase-5-builder`**.
- Use small logical commits, e.g.:
  - `feat(web): customize a preset in the builder`
  - `feat(web): add options from existing decisions`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including the geometry check and the bundle size
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check at `localhost:5173`:
   - preset → "Tùy chỉnh" → edit → Lưu
   - the builder "Thêm từ có sẵn" on phone and desktop
   - adding several options in a row, the filled empty rows, the 20-option limit
