# HANDOFF 4-2 — Preset preview, plus 4-1 clean-up

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-010**, **D-024** and **D-028** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

4-1 added React Router 8, the Home screen and `/presets/:slug`, which opens the case directly.

The owner decided (D-028) that tapping a preset card first opens a **preview**. There, the user can switch individual options off, with at least 2 staying on, and then open the case. The switched-off options live in the URL as `?off=` with 0-based option indexes, so Back, reload and shared links all keep them.

The 4-1 review also found a few small clean-ups in the same files. They are part C0 of this task.

## Scope
- C0: clean up the 4-1 code.
- C1: a `BackLink` UI primitive, shown in `/design`.
- C2: the `off` URL helpers.
- C3: the preview screen at `/presets/:slug`.
- C4: move the case to `/presets/:slug/open`, honouring `off`.

## Out of scope (do NOT do)
- Weights UI, adding or renaming options, saving anything. That is all Phase 5.
- Any change to `packages/domain`, the API, Docker or the Caddyfile.
- New tokens or new dependencies.
- Changes to the carousel, the celebration or the timing.

## Files to create / modify
- `apps/web/src/components/ui/BackLink.tsx` and `.module.css` (new)
- `apps/web/src/pages/design/ComponentsSection.tsx`: a BackLink demo
- `apps/web/src/features/presets/presets.ts`: the `off` helpers
- `apps/web/src/features/presets/PresetPreviewPage.tsx` and `.module.css` (new)
- `apps/web/src/features/presets/PresetCasePage.tsx`
- `apps/web/src/app/App.tsx`: routes
- `apps/web/src/features/case-opening/CaseOpening.tsx` and `.module.css`
- `apps/web/src/features/home/HomePage.tsx` and `.module.css`
- `apps/web/src/features/home/ModeSelector.tsx` and `.module.css`
- `apps/web/src/i18n/vi.ts`

## Requirements

### C0 — 4-1 clean-up
1. `CaseOpening.module.css`: delete the dead `.header p` rule. The tagline is gone.
2. `HomePage.tsx`: the tones list becomes exactly `['primary', 'secondary', 'accent'] as const`, still indexed with `index % tones.length`. Four cards still render primary, secondary, accent, primary, and a 5th card would no longer repeat primary twice in a row.
3. `ModeSelector.tsx`: remove `aria-disabled`. The native `disabled` already exposes it.
4. `ModeSelector`: delete the local `.visuallyHidden` rule and use the existing global `visually-hidden` class from `styles/global.css`, as `Switch` does. Add `position: relative` to `.option`, so the hidden input is anchored inside its own tile.
5. `HomePage.module.css`, preset card states:
   - Put the hover lift inside `@media (hover: hover)`, so it does not stick after a tap on touch screens.
   - Make the press mirror the large Button: on `.presetLink:active`, translate by `var(--shadow-offset)` and set the card's `box-shadow: none` (e.g. `.presetLink:active .presetCard`).

### C1 — `BackLink` primitive (`components/ui/BackLink.tsx`)
- Props: `ComponentPropsWithoutRef<typeof Link>` from `react-router`. The children are the label.
- It renders a router `<Link>` with an `aria-hidden` "←" before the children.
- Move the styles from `.backLink` in `CaseOpening.module.css` into `BackLink.module.css` unchanged:
  - teal-700 text, bold, no underline
  - underline on hover
  - global focus ring
  - `justify-self: start`
  
  Then delete `.backLink` from `CaseOpening.module.css`.
- `/design` renders outside the router, so wrap the demo in a `<MemoryRouter>` (from `react-router`), local to that demo.
- `CaseOpening` uses `<BackLink to={backTo}>{t('back')}</BackLink>`.

### C2 — `off` helpers (in `presets.ts`)
```ts
export function parseOff(value: string | null, optionCount: number): ReadonlySet<number>;
export function formatOff(off: ReadonlySet<number>): string; // sorted ascending, comma-joined; '' for empty
export function applyOff(options: readonly DecisionOptionData[], off: ReadonlySet<number>): DecisionOptionData[];
```
- `parseOff`:
  - split on `,`
  - keep only tokens matching `/^\d+$/` whose value is `< optionCount`, de-duplicated
  - if fewer than `DECISION_LIMITS.minEnabledOptions` options would stay enabled, return an **empty** set: a bad URL means "everything on"
  - `null` or `''` → empty set
- `applyOff`: return the same options in the same order, with `enabled: !off.has(index)`. Do not filter. The domain already ignores disabled options (`select`, `buildAnimationPlan`).

### C3 — Preview screen (`PresetPreviewPage.tsx`, route `/presets/:slug`)
- Unknown slug → `<NotFoundPage />`.
- `off = parseOff(searchParams.get('off'), options.length)` (`useSearchParams`).
- Layout: the same screen and column pattern as Home (cream background, `--content-max-width` column, token spacing).
  1. `<BackLink to="/">{t('back')}</BackLink>`
  2. a header with the preset emoji (large, `aria-hidden`), `<h1>` the preset title, and a lead `t('previewLead')`
  3. a `<ul>` of options in preset order. Each row is a `Card` (surface tone) laid out as:
     - the option emoji, `aria-hidden`
     - the label
     - a `Switch` with `checked = !off.has(index)` and `label = option.label` with `hideLabel`, so the row text is visible once and the switch is still named
     - switched-off rows keep full contrast. Indicate "off" only via the switch and an `--opacity-dimmed` on the emoji and label. Do not dim the switch, and use no strike-through.
  4. When exactly `DECISION_LIMITS.minEnabledOptions` options are on:
     - the switches of those remaining on options are `disabled`, so they cannot be turned off
     - a muted hint `t('minOptionsHint')` shows below the list
  5. a large primary `Button` `t('openCase')` that navigates to `open` plus the current search string (`useNavigate`, relative path or `/presets/${slug}/open${search}`). It is a push, not a replace.
- Toggling a switch:
  - recompute the set
  - write `?off=` with `setSearchParams(..., { replace: true })`, removing the param when the set is empty
  - no React state besides the URL
- `<title>`: `{preset title} · PIKO`.
- Responsive: one column. From `48rem` up, the list may become two columns inside `--content-wide-max-width`, the same pattern as Home. Grid items that contain text need `min-width: 0`. Long labels such as "Trung tâm thương mại" must wrap, not overflow.

### C4 — Case route (`PresetCasePage.tsx`, route `/presets/:slug/open`)
- Unknown slug → `<NotFoundPage />`.
- Pass `options = applyOff(preset.decision.options, parseOff(...))`.
- Set `backTo` to `/presets/${slug}` plus the current search, so going back to the preview keeps the switches.
- Use `key={`${slug}?${formatOff(off)}`}` so the case resets when the selection changes.

### Routes (`App.tsx`)
```tsx
<Route path="/" element={<HomePage />} />
<Route path="/presets/:slug" element={<PresetPreviewPage />} />
<Route path="/presets/:slug/open" element={<PresetCasePage />} />
<Route path="*" element={<NotFoundPage />} />
```

### i18n (`vi.ts`)
- Add:
  - `previewLead: 'Tắt những lựa chọn bạn không muốn, rồi mở case.'`
  - `minOptionsHint: 'Cần ít nhất 2 lựa chọn.'`
- Remove any key that becomes unused. Check each one with `git grep`.

### Conventions
- Tokens only (no raw color, duration, shadow or z-index literals).
- Animate only `transform`/`opacity`.
- No inline `style` attributes.
- Show weights nowhere. Show no percentages and no counts of odds (D-010).

## Acceptance criteria
- [ ] Home card → preview → "Mở case" → case. Back from the case returns to the preview with the same switches. Back again returns to Home.
- [ ] Switching options off updates `?off=` in place, with no new history entries. Reload keeps it. Only the enabled options appear in the case strip and can win.
- [ ] You cannot get below 2 options: the last 2 switches are disabled and the hint shows.
- [ ] Bad `off` values all fall back to everything on, without crashing: `?off=abc`, `?off=99`, `?off=0,1,2,3,4,5,6,7`.
- [ ] `/presets/xyz` and `/presets/xyz/open` show Not found.
- [ ] `BackLink` is shown in `/design`. `.backLink` is gone from `CaseOpening.module.css`, and the local `.visuallyHidden` is gone from `ModeSelector.module.css`.
- [ ] No horizontal overflow at 360 px and 1280 px on the preview. Check element geometry, not only `scrollWidth`.
- [ ] `make check` passes.

## Validation
Run and include the output in the report:
```bash
make check
git grep -n "visuallyHidden\|aria-disabled\|backLink" -- apps/web/src
git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(" -- apps/web/src/features apps/web/src/app apps/web/src/components
git diff --stat feat/phase-4-home...HEAD
```
- The first grep must return nothing.
- After switching branches, run `docker compose -f compose.dev.yaml restart web` (see `docs/ENVIRONMENTS.md`).

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/4-2-preset-preview` from **`feat/phase-4-home`**. It already contains 4-1.
- Use small logical commits, e.g.:
  - `refactor(web): clean up 4-1 home and mode selector`
  - `feat(web): add BackLink primitive`
  - `feat(web): add preset preview with off switches`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including the geometry check at 360 px and 1280 px
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check at `localhost:5173`:
   - the preview look on phone and desktop
   - switching options off and on, and the 2-option limit with its hint
   - Back and reload keep the switches
   - the case only uses enabled options
   - preset card hover and press on desktop; no stuck lift after a tap on a phone
