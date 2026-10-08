# HANDOFF 1b-2 — UI primitives in `/design`

You are the implementer for the project "What Should We Do?" in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

1b-1 is merged on `main`. It provides:
- `apps/web/src/styles/tokens.css`: all design tokens
- `fonts.css`, with Baloo 2 + Be Vietnam Pro self-hosted (D-021)
- `global.css`
- a dev-only `/design` page in `apps/web/src/pages/design/` (D-022)

The owner reviewed the tokens in the browser and accepted them.

This task builds the first **design-system primitives** and shows every variant and state on `/design`. Feature screens (Home, Builder, …) come in later phases and will compose these primitives. Do not build feature components now.

It also fixes a bug found in the 1b-1 review (R0).

Visual direction: mood board `images/figma_unisex_screens_design.png`, used for style only.
- **Chunky:** a navy outline (`--border-width`) and a solid offset shadow below (`--shadow-chunky*`).
- **Rounded:** generous radius, playful.
- Bold display font on CTAs.
- Game-like, not casino-like (D-010): no glow, no gold, no rarity colors.

## Scope
- R0: fix the Motion demo on `/design`.
- R1: add shadow-offset tokens and the `.visually-hidden` utility.
- R2–R7: build six primitives — `Button`, `Card`, `Chip`, `Badge`, `TextField`, `Switch` — in `apps/web/src/components/ui/`.
- R8: a new "Components" section on `/design` showing every variant × state.

## Out of scope (do NOT do)
- Feature components (mode selector, option list, preset cards, case carousel) and any screen.
- A router, icons or emoji sets, dark mode, animation libraries.
- Changes to `App.tsx` logic, `apps/api`, `packages/domain`, Docker or the Makefile.
- New dependencies of any kind.
- Render, snapshot or E2E tests.

## Files to create / modify
- `apps/web/src/styles/tokens.css`: R1 tokens only.
- `apps/web/src/styles/global.css`: the `.visually-hidden` utility only.
- `apps/web/src/components/ui/Button.tsx` + `Button.module.css`
- `apps/web/src/components/ui/Card.tsx` + `Card.module.css`
- `apps/web/src/components/ui/Chip.tsx` + `Chip.module.css`
- `apps/web/src/components/ui/Badge.tsx` + `Badge.module.css`
- `apps/web/src/components/ui/TextField.tsx` + `TextField.module.css`
- `apps/web/src/components/ui/Switch.tsx` + `Switch.module.css`
- `apps/web/src/pages/design/ComponentsSection.tsx` (+ `.module.css` if needed): the demo section, kept out of `DesignPage.tsx` because that file is already long.
- `apps/web/src/pages/design/DesignPage.tsx` / `DesignPage.module.css`: render the new section, fix R0.

Do **not** add a barrel `index.ts`. Import each component from its own file.

## Allowed dependencies
None. Anything new requires stopping and asking.

## Requirements

### R0. Fix the Motion demo (1b-1 review finding)

The square in the Motion section does not move. In `@keyframes motion-travel`, `translateX(calc(100% - var(--space-4)))` resolves to 0, because in `transform` the `100%` is the square's **own** width (`--space-4`).

Fix it with container query units:
- `.motionTrack` gets `container-type: inline-size`.
- The keyframe ends at `translateX(calc(100cqi - 100%))`. Here `100cqi` is the track's content width and `100%` is the square's width.

**Acceptance:** each Play button visibly moves the square from the left end to the right end of its track. With reduced motion on, it moves faster.

### R1. Token additions

**Shadow offsets.** Add these to `tokens.css`, and redefine the three chunky shadows to use them (values unchanged):
```css
--shadow-offset-sm: 3px;
--shadow-offset: 5px;
--shadow-offset-lg: 8px;
--shadow-chunky-sm: 0 var(--shadow-offset-sm) 0 var(--color-shadow);
--shadow-chunky: 0 var(--shadow-offset) 0 var(--color-shadow);
--shadow-chunky-lg: 0 var(--shadow-offset-lg) 0 var(--color-shadow);
```
These are needed for the "press" effect: an element moves down by its shadow offset while its shadow shrinks, so it looks pushed in.

**`.visually-hidden` utility.** Add it to `global.css`: the standard clip pattern, so screen readers still read the content. It is used for hidden labels.

### Shared rules for all primitives
- Typed props. Extend the native element's attributes where it makes sense (`ComponentPropsWithoutRef<'button'>`, etc.), spread the remaining props onto the native element, and merge `className`.
  - React 19: `ref` is a normal prop. Do not use `forwardRef`.
- Use native elements and native semantics first. Use no `div` with `onClick`.
- Tokens only (CLAUDE.md design system rules). Use no literal colors, durations, shadows or px values; use `--space-*`, `--shadow-offset*`, `--border-width*` and `--tap-target-min`. Small percentages (`50%`) and `0` are fine.
- Every interactive element:
  - has a minimum hit area of `--tap-target-min`
  - shows a visible `:focus-visible` ring (the global one, or a token-based local one)
  - has a disabled style using `--color-disabled-bg` / `--color-disabled-text`, with no shadow and `cursor: not-allowed`
- Animate only `transform` and `opacity`, with `--duration-*` and `--ease-*` tokens. A `box-shadow` may **change** on `:active`, but must not be transitioned.
- **Press pattern** (Button, Chip): on `:active:not(:disabled)`, apply `transform: translateY(<the element's shadow offset>)` and `box-shadow: none`.
  - Do **not** darken the background on press or hover. Navy text on `--color-primary-pressed` is only 3.9:1 (1b-1 review).
  - A hover effect is optional. If you add one, it must use transform only (e.g. lift by `calc(var(--shadow-offset-sm) * -0.5)`), wrapped in `@media (hover: hover)`.
- Text colors must respect the D-008 contrast rules:
  - white text on coral only at ≥ 24px, or ≥ 18.66px bold
  - never white text on teal or lemon
- Components contain **no** hard-coded user-facing strings. All text comes from props or children. Feature code will pass i18n strings later.

### R2. `Button`
- Renders a native `<button>`, `type="button"` by default.
- Props: `variant?: 'primary' | 'secondary' | 'outline'` (default `primary`), `size?: 'md' | 'lg'` (default `md`), `fullWidth?: boolean`, plus native button props.
- **Variants:**

  | Variant | Background | Text |
  |---|---|---|
  | `primary` | `--color-primary` | see sizes |
  | `secondary` | `--color-secondary` | `--color-on-secondary` |
  | `outline` | `--color-surface` | `--color-text` |

- **Sizes:**
  - `md`: body font, `--font-weight-bold`, `--text-md`, height ≥ `--tap-target-min`, `--shadow-chunky-sm`. A primary `md` button uses `--color-on-primary-strong` (navy).
  - `lg`: the main CTA ("XOAY KÈO" style). Display font, `--font-weight-display`, `--text-xl`, uppercase, `--shadow-chunky`, generous padding. A primary `lg` button uses `--color-on-primary` (white, allowed because it is ≥ 24px bold).
- All variants: `--border-width` solid `--color-border`, `--radius-lg` (`lg`) / `--radius-md` (`md`), press pattern.
- `disabled` uses the native attribute.

### R3. `Card`
- Renders a `<div>` (static container, not interactive). Interactive cards are decided in Phase 4.
- Props: `tone?: 'surface' | 'primary' | 'secondary' | 'accent'` (default `surface`), plus native div props.
- Background is the tone color. Text is the matching `--color-on-*`:
  - `surface` uses `--color-text`.
  - `primary` uses `--color-on-primary-strong`, because card text can be small.
- `--border-width` navy border, `--radius-lg`, `--shadow-chunky`, padding `--space-5`.

### R4. `Chip`
- A toggle button: native `<button type="button">` with `aria-pressed`.
- Props: `selected: boolean`, `onSelectedChange?: (selected: boolean) => void`, `disabled?`, `children`, plus native button props except `onClick` and `aria-pressed`, which the component controls.
- Unselected: `--color-surface`, `--color-text`, `--border-width-thin` border, `--shadow-chunky-sm`, `--radius-pill`.
- Selected: `--color-secondary` background, `--color-on-secondary` text, `--border-width` border. Selection must not depend on color alone: also use the thicker border and `--font-weight-bold`.
- Press pattern.
- A locked "Soon" chip is `disabled` + a `Badge` child. The `/design` demo shows it. The Couple/Squad mode cards in Phase 4 will build on this (D-004).

### R5. `Badge`
- Renders a `<span>`. Non-interactive.
- Props: `tone?: 'neutral' | 'accent'` (default `accent`).
- Uses `--text-xs`, `--font-weight-bold`, uppercase, `--radius-pill`, `--border-width-thin` navy border, padding `--space-1` / `--space-2`.
  - `accent`: lemon background with navy text.
  - `neutral`: `--color-surface` with `--color-text-muted`.

### R6. `TextField`
- Label + `<input>` + optional hint + optional error.
- Props: `label: string`, `hideLabel?: boolean` (uses `.visually-hidden`), `hint?: string`, `error?: string`, plus native input props.
  - `id`: if not passed, generate one with `useId()`.
- Accessibility:
  - The label is always present (`<label htmlFor>`), even when visually hidden.
  - `aria-describedby` points to the hint and/or error ids when they are present.
  - When `error` is set, add `aria-invalid="true"`. The error text uses `--color-danger`, and is announced because it is in `aria-describedby`.
- Style:
  - `--color-surface` background, `--border-width` navy border, `--radius-md`
  - height ≥ `--tap-target-min`, padding `--space-3` / `--space-4`
  - placeholder color `--color-text-muted`
  - error state: border `--color-danger`
  - disabled state uses the disabled tokens

### R7. `Switch`
- A native `<button type="button" role="switch" aria-checked={checked}>`.
- Props: `checked: boolean`, `onCheckedChange: (checked: boolean) => void`, `label: string`, `hideLabel?: boolean`, `disabled?`.
- Label handling:
  - The visible label sits next to the switch.
  - Clicking the label toggles the switch. Use a wrapping element and `aria-labelledby`, not a `<label>` for a button.
  - When `hideLabel` is set, the label is visually hidden but still names the switch.
- Track:
  - pill-shaped, `--border-width-thin` navy border
  - off: `--color-disabled-bg`
  - on: `--color-secondary`
- Thumb:
  - circle with `--color-surface` and a navy border
  - moves with `transform: translateX(...)` only, using `--duration-normal` and `--ease-spring`
- Size the track and thumb from `--space-*` tokens. Compute the thumb travel with `calc()` from those same tokens, so there are no magic numbers.
- The hit area is ≥ `--tap-target-min` in height. The track may be smaller visually, with padding around it.
- Space/Enter toggle it natively, because it is a button.

### R8. `/design` "Components" section
Add a sixth section, **Components** (`id="components"`), after Motion. Put it in `ComponentsSection.tsx`.

It shows:
- **Button:** a grid of variant × size, with one disabled row. Sample labels: `Xoay kèo ngay` (lg primary), `Thêm lựa chọn`, `Quay lại`.
- **Card:** all four tones, each with a display-font title and a body line. Samples: `Ăn gì tối nay?` / `Phở, bún chả hay cơm tấm?`.
- **Chip:**
  - a working group of three chips where exactly one is selected at a time (local `useState`)
  - a standalone toggle chip
  - two locked chips: `Couple` + Badge `Sắp có`, and `Squad` + Badge `Sắp có`
- **Badge:** both tones.
- **TextField:**
  - default with placeholder `Thêm một lựa chọn…`
  - with hint
  - with error `Không được để trống`
  - disabled
  - hidden label
- **Switch:** off, on, disabled, hidden label. They are controlled with local state.

Per D-022:
- Demo labels and sample strings may be literals in the design page files.
- The components themselves contain none.

## Acceptance criteria
- [ ] R0: each Motion "Play" moves the square across its full track.
- [ ] `/design` shows the Components section with every item listed in R8.
- [ ] Keyboard only (Tab / Shift+Tab / Space / Enter):
  - every interactive primitive is reachable, shows a focus ring and can be operated
  - disabled ones are skipped
- [ ] Pressing a Button or Chip visibly "sinks" into its shadow (translate + shadow removed). No background darkening on hover or press.
- [ ] Chip `aria-pressed`, Switch `aria-checked`, and TextField `aria-invalid` / `aria-describedby` reflect state (check in DevTools Accessibility pane).
- [ ] Raw-literal check prints nothing. The `px` check prints only the existing prose line in `DesignPage.tsx` ("A 4px base…").
- [ ] Production web build still contains no `/design` code. The main JS gzip size stays within +1 kB of 91.7 kB, because primitives are unused outside `/design` for now and get tree-shaken.
- [ ] `make check` passes.

## Validation
Run these and include the trimmed output in the report:
```bash
make dev
make check

# raw literals outside tokens.css (must print nothing)
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|cubic-bezier\(|[0-9.]+m?s\b" apps/web/src --include='*.css' --include='*.tsx' --include='*.ts' | grep -v 'apps/web/src/styles/tokens.css'

# px literals outside tokens.css (must print only the existing prose line DesignPage.tsx "A 4px base keeps…")
grep -rnE "[0-9]px" apps/web/src --include='*.css' --include='*.tsx' | grep -v 'apps/web/src/styles/tokens.css'

docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c \
  'pnpm --filter @wswd/web build && \
   (grep -rl "DesignPage\|ẤẦẨẪẬ\|Xoay kèo ngay" apps/web/dist && echo "LEAK" || echo "no /design in prod build")'
```

If a grep flags a false positive, report the exact line instead of weakening the pattern.

Afterwards delete `apps/web/dist`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/1b-2-ui-primitives` from `main`.
- Make exactly **one** commit: `feat(web): UI primitives and components section in /design`.
- Do not commit to `main`, merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including the main JS/CSS gzip sizes
4. Deviations from this handoff and why
5. Known issues / open questions
6. What the owner should check in the browser:
   - the `/design#components` and `/design#motion` URLs
   - the keyboard path to try
   - anything that looked off to you
