# HANDOFF 1b-2-fix-1 — Cleanup of the UI primitives and the Components demo

You are the implementer for the project "What Should We Do?" in this repository.
Read `CLAUDE.md` first, then `docs/handoffs/1b-2-ui-primitives.md`. This task cleans up issues found in the review of that handoff.

You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- If anything conflicts or is impossible, stop and report.

## Context

Handoff 1b-2 is committed as `5ec3629` on branch `feat/1b-2-ui-primitives`. The owner checked `/design#components` and `/design#motion` in the browser and accepted the visuals and keyboard behavior. `make check`, the literal greps, the prod-build leak check and the bundle size (91.70 kB gz) all pass.

This task is a **pure cleanup**: remove duplication, dead CSS and unnecessary code. **The rendered result must not change visually**, except for the one a11y attribute fix in C2. Do not "improve" anything that is not listed here.

Leave these exactly as they are:
- `tokens.css` and the Motion fix (R0) in `DesignPage.module.css`
- `.visually-hidden` in `global.css` (using `--border-width-thin` for its size is accepted)
- the Switch geometry (track/thumb sizes and the thumb-travel `calc()`)
- component props/APIs, defaults and the `type = 'button'` handling
- every color, border, shadow and press/disabled visual

## Scope
- C1: remove the section chrome CSS duplicated from `DesignPage.module.css`.
- C2: fix the invalid `aria-label` on a plain `div` in the Chip demo.
- C3: remove dead CSS.
- C4: replace the Switch `.disabled` class with the native `:disabled` state.
- C5: simplify the class-name merging and the prop pass-through.
- C6: two demo nits.

## Out of scope (do NOT do)
- Any visual change, new variant, new prop or new component.
- A shared `cx`/`classNames` helper or any other new module.
- Changes to `tokens.css`, `global.css`, `main.tsx`, `App.tsx`, `apps/api`, `packages/domain`, Docker or the Makefile.
- New dependencies. Render, snapshot or E2E tests.

## Files to modify
- `apps/web/src/pages/design/ComponentsSection.tsx`
- `apps/web/src/pages/design/ComponentsSection.module.css`
- `apps/web/src/components/ui/Button.tsx` + `Button.module.css`
- `apps/web/src/components/ui/Chip.tsx` + `Chip.module.css`
- `apps/web/src/components/ui/Switch.tsx` + `Switch.module.css`
- `apps/web/src/components/ui/Card.tsx`, `Badge.tsx`, `TextField.tsx` (C5 only)

## Allowed dependencies
None.

## Requirements

### C1. Reuse the `/design` section chrome
`ComponentsSection.module.css` copies `.section`, `.sectionHeading`, `.sectionHeading h2`, `.sectionHeading p:not(.sectionIndex)`, `.sectionIndex` and the `.section` padding media rule from `DesignPage.module.css`. The two copies will drift.

- In `ComponentsSection.tsx`, also import `./DesignPage.module.css` (e.g. as `pageStyles`) and use `pageStyles.section`, `pageStyles.sectionHeading` and `pageStyles.sectionIndex` for the section wrapper and heading.
- Delete those duplicated rules from `ComponentsSection.module.css`, including the `.section` padding inside its `@media` block.
- The Components section must look identical to the other five sections (border, radius, surface, padding, heading). Check that `pageStyles.section` brings the border/background, because in `DesignPage.module.css` they come from the shared `.hero, .section, .contents` rule.

### C2. Chip demo group label
`<div className={styles.chipGroup} aria-label="Modes">` puts `aria-label` on an element with no role. `aria-label` is not allowed on a generic `div`, and screen readers ignore it.

- Add `role="group"` to that `div` and keep `aria-label="Modes"`.
- Do not add roles to the other demo groups.

### C3. Dead CSS
Remove these rules or declarations. None of them has any effect:
- `Button.module.css` and `Chip.module.css`: `transform: none;` inside `:disabled`. The only transform comes from `:active:not(:disabled)`, so it never applies to a disabled element.
- `ComponentsSection.module.css`:
  - `.cardGrid { grid-template-columns: 1fr; }` and the `.fieldGrid, .switchGrid { grid-template-columns: 1fr; }` base rules. A grid is single-column by default.
  - `.cardGrid { align-items: stretch; }` inside the media block. It is the default.
  - `.chipExamples` in the `.chipExamples, .inlineItems { display: flex; … }` selector, because the next rule overrides it with `display: grid`. Keep `.inlineItems` in that rule.

### C4. Switch: use the native disabled state
`Switch.tsx` adds a `styles.disabled` class from the `disabled` prop, which duplicates the native `:disabled` state of the `<button>`.

- In `Switch.module.css`, rename `.disabled .track` and `.disabled .thumb` to `.switch:disabled .track` and `.switch:disabled .thumb`. These have higher specificity than `.checked .track`, so a disabled + checked switch still shows the disabled track, as it does now.
- In `Switch.tsx`, remove the `disabled ? styles.disabled : ''` entry. Since `disabled` is no longer needed in the component body, stop destructuring it and let it pass through `...props`.

### C5. Simplify class merging and pass-through
In all six components, the class lists use `className ?? ''` and `cond ? styles.x : ''` before `.filter(Boolean)`. The fallbacks are redundant, because `filter(Boolean)` already removes `undefined` and `false`.

- Use `className` directly, and `cond && styles.x` instead of `cond ? styles.x : ''`. Keep the ternary where both branches are real classes (Chip `selected ? styles.selected : styles.unselected`, TextField label/`visually-hidden`).
- Keep the inline `[...].filter(Boolean).join(' ')` pattern in each file. Do **not** extract a helper.
- `Chip.tsx`: stop destructuring `disabled` and `children` only to pass them on. Let them flow through `...props` and render a self-closing `<button … />`. The controlled attributes (`aria-pressed`, `onClick`, `type`, `className`) must still come **after** `{...props}`.

### C6. Demo nits in `ComponentsSection.tsx`
- `<Badge> Sắp có </Badge>` has stray spaces inside. Use `<Badge>Sắp có</Badge>`.
- The disabled TextField uses `value="…"` + `readOnly` only to silence React's controlled-input warning. Use `defaultValue="Không thể chỉnh sửa"` and drop `readOnly`.

## Acceptance criteria
- [ ] `/design#components` looks the same as before, and the Components section matches the other sections' chrome.
- [ ] `ComponentsSection.module.css` no longer defines `.section`, `.sectionHeading` or `.sectionIndex`.
- [ ] No `transform: none` in `Button.module.css` / `Chip.module.css`. No `styles.disabled` or `.disabled` selector in Switch.
- [ ] No `?? ''` and no `? styles.x : ''` patterns remain in `components/ui/`.
- [ ] The modes chip group has `role="group"`.
- [ ] A disabled + checked Switch still shows the grey track; disabled Button/Chip/Switch are still skipped by Tab.
- [ ] Raw-literal grep prints nothing; `px` grep prints only `DesignPage.tsx` "A 4px base…".
- [ ] `/design` is absent from the prod build; main JS gzip stays at about 91.7 kB (±0.2 kB).
- [ ] `make check` passes.

## Validation
Run these and include the trimmed output in the report:
```bash
make check

grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|cubic-bezier\(|[0-9.]+m?s\b" apps/web/src --include='*.css' --include='*.tsx' --include='*.ts' | grep -v 'apps/web/src/styles/tokens.css'
grep -rnE "[0-9]px" apps/web/src --include='*.css' --include='*.tsx' | grep -v 'apps/web/src/styles/tokens.css'

grep -rnE "\?\? ''|: ''\]|: '',|transform: none|styles\.disabled|\.disabled " apps/web/src/components/ui
grep -nE "^\.(section|sectionHeading|sectionIndex)\b" apps/web/src/pages/design/ComponentsSection.module.css

docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c \
  'pnpm --filter @wswd/web build && \
   (grep -rl "DesignPage\|ẤẦẨẪẬ\|Xoay kèo ngay" apps/web/dist && echo "LEAK" || echo "no /design in prod build")'
```
The two cleanup greps must print nothing. Afterwards delete `apps/web/dist`.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Stay on branch `feat/1b-2-ui-primitives`.
- Make exactly **one** new commit on top of `5ec3629`: `refactor(web): clean up UI primitives and components demo`.
- Do not amend, commit to `main`, merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including the main JS/CSS gzip sizes
4. Deviations from this handoff and why
5. Known issues / open questions
6. What the owner should check in the browser:
   - `/design#components`: same look as before; the Components section matches the others
   - the disabled + checked Switch, and the Tab path skipping disabled controls
