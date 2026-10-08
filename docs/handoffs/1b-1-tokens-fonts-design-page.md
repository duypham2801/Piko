# HANDOFF 1b-1 — Design tokens, self-hosted fonts and the `/design` page

You are the implementer for the project "What Should We Do?" in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies beyond what is listed.
- Stop and report if anything conflicts.

## Context

Phase 1a is done. `main` has:
- the monorepo
- the dev and prod Docker stacks
- the guest session
- a sanity page at `/` (`apps/web/src/App.tsx`)

There is no styling yet.

Phase 1b builds the design system in two steps:
- **1b-1 (this task):** design tokens, self-hosted fonts, global base styles, and a dev-only `/design` page that shows the tokens. The owner reviews it in the browser before any component is built.
- **1b-2 (later):** UI primitives (Button, Card, Chip, Input, Toggle, "Soon" badge). **Not part of this task.**

Relevant decisions in `docs/DECISIONS.md`:
- D-002: CSS Modules + CSS custom properties, no UI framework.
- D-003: Vietnamese UI.
- D-008: palette and contrast rule.
- D-010: not-casino guardrails.
- D-021: fonts are Baloo 2 + Be Vietnam Pro via Fontsource.
- D-022: `/design` is dev-only and there is no router yet.

The mood board `images/figma_unisex_screens_design.png` is for style only. Its feel is chunky navy outlines, offset "pressed" shadows, rounded corners and a cream background. Its hex values and font names are **not** spec. The values in this handoff are the spec.

## Scope
- Add two font packages and self-host the fonts through Vite.
- Create `tokens.css`, `fonts.css` and `global.css`, and load them in `main.tsx`.
- Add a dev-only `/design` page that shows every token group.
- Make the existing sanity page at `/` pick up the global styles. Change no logic.

## Out of scope (do NOT do)
- Any UI primitive or shared component (Button, Card, etc.). That is 1b-2.
- A router library, or any routing beyond the single pathname check described below.
- Dark mode (the product is light-only for MVP).
- Emoji or icon sets.
- Changes to `apps/api`, `packages/domain`, Docker, the Caddyfile or the Makefile.
- Stylelint or any other new tooling.
- Render, snapshot or E2E tests.

## Files to create / modify
- `apps/web/package.json`: add the two font dependencies (exact versions). `pnpm-lock.yaml` updates accordingly.
- `apps/web/src/styles/fonts.css` (new): Fontsource imports only.
- `apps/web/src/styles/tokens.css` (new): every design token, as custom properties on `:root`.
- `apps/web/src/styles/global.css` (new): reset and base element styles, using tokens only.
- `apps/web/src/main.tsx`: import the three stylesheets, plus the dev-only `/design` switch.
- `apps/web/src/pages/design/DesignPage.tsx` and `DesignPage.module.css` (new). Split into a few files in the same folder if the page gets long; no shared components.
- `apps/web/index.html`: no change is expected. If you change it, keep `lang="vi"`.

## Allowed dependencies
- `@fontsource-variable/baloo-2@5.3.0`: display font, variable weight, has the Vietnamese subset (D-021).
- `@fontsource/be-vietnam-pro@5.3.0`: body font, has the Vietnamese subset (D-021).

Add both to `apps/web` **dependencies** with exact versions (no `^`). Run pnpm **inside the dev container**, never on the host:
```bash
docker compose -f compose.dev.yaml run --rm --no-deps install pnpm --filter @wswd/web add -E @fontsource-variable/baloo-2@5.3.0 @fontsource/be-vietnam-pro@5.3.0
docker compose -f compose.dev.yaml restart web
```
Anything else requires stopping and asking.

## Requirements

### R1. Fonts (`styles/fonts.css`)

**Display font:**
```css
@import '@fontsource-variable/baloo-2/wght.css';
```

**Body font:** import only weights 400, 500 and 700 (normal style, no italics):
```css
@import '@fontsource/be-vietnam-pro/400.css';
@import '@fontsource/be-vietnam-pro/500.css';
@import '@fontsource/be-vietnam-pro/700.css';
```

These files use `unicode-range`. The browser downloads only the subsets the page actually uses (Latin + Vietnamese). Unused subset files may still land in `dist/assets`; that is accepted.

Fonts must be emitted by Vite into `dist/assets` (same origin). Do not load any font CDN, so the existing CSP `font-src 'self'` keeps working.

Do not add `<link rel="preload">` for fonts in this task.

### R2. Tokens (`styles/tokens.css`)

Define these custom properties on `:root`. Use exactly these names. Values may only be changed after the owner's browser review, through a fix handoff.

**Raw palette (`--palette-*`):**
- Components must **never** use these directly; they use semantic tokens.
- They exist only so the semantic tokens and the `/design` page can reference them.

| Token | Value |
|---|---|
| `--palette-coral-500` | `#FF5722` |
| `--palette-coral-700` | `#D84315` |
| `--palette-teal-500` | `#14B8A6` |
| `--palette-teal-700` | `#0F766E` |
| `--palette-lemon-400` | `#FBBF24` |
| `--palette-cream-50` | `#FFFBEB` |
| `--palette-navy-900` | `#0F172A` |
| `--palette-slate-600` | `#475569` |
| `--palette-slate-200` | `#E2E8F0` |
| `--palette-white` | `#FFFFFF` |
| `--palette-red-700` | `#B91C1C` |
| `--palette-green-700` | `#15803D` |

**Semantic colors (`--color-*`):**
- These values are fixed.
- Each pair carries the contrast ratio the architect measured (WCAG). Keep a short comment with the ratio and the usage rule next to each "on" token.

| Token | Value | Rule |
|---|---|---|
| `--color-bg` | cream-50 | page background |
| `--color-surface` | white | cards, inputs |
| `--color-text` | navy-900 | 17.2:1 on cream |
| `--color-text-muted` | slate-600 | 7.3:1 on cream |
| `--color-text-accent` | teal-700 | 5.3:1 on cream; teal text on light backgrounds |
| `--color-border` | navy-900 | chunky outlines |
| `--color-shadow` | navy-900 | offset "pressed" shadows |
| `--color-primary` | coral-500 | main CTA |
| `--color-primary-pressed` | coral-700 | active/pressed state |
| `--color-on-primary` | white | 3.2:1: **large/bold text only** (≥ 24px, or ≥ 18.66px bold) |
| `--color-on-primary-strong` | navy-900 | 5.6:1: any text size on coral |
| `--color-secondary` | teal-500 | |
| `--color-on-secondary` | navy-900 | 7.2:1. White on teal is **forbidden** (2.5:1) |
| `--color-accent` | lemon-400 | |
| `--color-on-accent` | navy-900 | 10.7:1. White on lemon is **forbidden** |
| `--color-focus-ring` | teal-700 | ≥ 3:1 against cream/white |
| `--color-danger` | red-700 | 6.2:1 on cream |
| `--color-success` | green-700 | 4.8:1 on cream |
| `--color-disabled-bg` | slate-200 | |
| `--color-disabled-text` | slate-600 | |
| `--color-selection` | lemon-400 | `::selection` background |

**Typography:**

| Token | Value |
|---|---|
| `--font-display` | `'Baloo 2 Variable', 'Baloo 2', ui-rounded, system-ui, sans-serif` |
| `--font-body` | `'Be Vietnam Pro', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| `--font-weight-regular` / `-medium` / `-bold` / `-display` | `400` / `500` / `700` / `800` |
| `--text-xs` / `-sm` / `-md` / `-lg` / `-xl` / `-2xl` / `-3xl` | `0.75rem` / `0.875rem` / `1rem` / `1.25rem` / `1.5rem` / `2rem` / `2.5rem` |
| `--text-display` | `clamp(2.5rem, 1.5rem + 5vw, 3.5rem)` |
| `--leading-tight` | `1.15` (**minimum** for the display font: Vietnamese stacked marks like Ấ Ổ Ữ need the room) |
| `--leading-normal` | `1.5` |

Check the exact family names against the Fontsource CSS you imported. If the name differs, use the real one and report it.

**Spacing (4px base):** `--space-1` … `--space-8` = `0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem, 3rem, 4rem`.

**Radius:**

| Token | Value |
|---|---|
| `--radius-sm` | `0.5rem` |
| `--radius-md` | `0.875rem` |
| `--radius-lg` | `1.25rem` |
| `--radius-pill` | `999px` |

**Borders and shadows:**

| Token | Value |
|---|---|
| `--border-width` | `3px` (chunky outline) |
| `--border-width-thin` | `2px` |
| `--shadow-chunky-sm` | `0 3px 0 var(--color-shadow)` |
| `--shadow-chunky` | `0 5px 0 var(--color-shadow)` |
| `--shadow-chunky-lg` | `0 8px 0 var(--color-shadow)` |
| `--shadow-soft` | `0 12px 32px rgb(15 23 42 / 0.18)` (overlays only) |

**Motion:**

| Token | Value |
|---|---|
| `--duration-fast` | `120ms` |
| `--duration-normal` | `220ms` |
| `--duration-slow` | `400ms` |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` (small overshoot) |

The case-opening carousel easing is **not** a token. It lives in `packages/domain` in Phase 2/3.

**Layout and layering:**

| Token | Value |
|---|---|
| `--content-max-width` | `30rem` (mobile-first column) |
| `--tap-target-min` | `44px` |
| `--z-base` / `--z-overlay` / `--z-toast` | `0` / `100` / `200` |

**Reduced motion:** add this block to `tokens.css`:
```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-normal: var(--duration-fast);
    --duration-slow: var(--duration-fast);
    --ease-spring: var(--ease-standard);
  }
}
```

### R3. Global styles (`styles/global.css`)
- `box-sizing: border-box` on everything. Remove default margins on `body`, headings, `p`, `figure` and lists that have a class.
- `html`: `-webkit-text-size-adjust: 100%`.
- `body`:
  - `min-height: 100dvh`
  - background `--color-bg`, text `--color-text`
  - `--font-body`, `--text-md`, `--leading-normal`
  - `-webkit-font-smoothing: antialiased`
- `h1–h3`: `--font-display`, `--font-weight-display`, `--leading-tight`.
- `button, input, select, textarea`: `font: inherit; color: inherit`.
- `img, svg`: `display: block; max-width: 100%`.
- `:focus-visible`: `outline: 3px solid var(--color-focus-ring); outline-offset: 3px`. Never remove the outline without a visible replacement.
- `::selection`: background `--color-selection`, color `--color-text`.
- Use no literal colors, durations or shadows. Only `var(--…)`.

### R4. Loading order (`main.tsx`)
1. Import `./styles/fonts.css`, `./styles/tokens.css` and `./styles/global.css`, in that order, before rendering.
2. Then pick what to render:
```tsx
const DesignPage = import.meta.env.DEV
  ? lazy(() => import('./pages/design/DesignPage'))
  : null;
const showDesign = DesignPage !== null && window.location.pathname === '/design';
```
3. Render `<DesignPage />` inside `<Suspense>` when `showDesign` is true; otherwise render `<App />`. Keep `<StrictMode>`.

The `import.meta.env.DEV` condition must remove the `/design` chunk from production builds entirely (see acceptance). The Vite dev server already serves `index.html` for `/design`, so no Vite config change should be needed.

### R5. `/design` page
A single scrollable page, mobile-first (max width `--content-max-width`, wider on desktop is fine). It uses CSS Modules and **only** semantic tokens. Raw `--palette-*` may appear only in the palette section.

Sections, in this order, each with an `h2` and an anchor id:
1. **Colors**
   - For each semantic color token: a swatch, the token name, and the resolved value. Read the value with `getComputedStyle` or hard-code it from this handoff.
   - For each "on" pair (`on-primary`, `on-primary-strong`, `on-secondary`, `on-accent`): a sample block that renders text on the background, with the ratio and rule from R2 as a caption.
   - Raw palette: a smaller row of swatches.
   - Set swatch colors through a CSS custom property in `style` (e.g. `style={{ '--swatch': 'var(--color-primary)' }}`), never through literal colors.
2. **Typography**
   - Every size token, rendered in both fonts.
   - The display font at weights 400/600/800.
   - The body font at 400/500/700.
   - Use this Vietnamese sample:
     - display: `Xoay kèo ngay! Bún chả Hà Nội`
     - body: `Hôm nay ăn gì đây? Phở bò, bánh xèo hay cơm tấm — để app quyết định nhé.`
   - A diacritics stress line in display size with `--leading-tight`: `ẤẦẨẪẬ ỐỒỔỖỘ ỨỪỬỮỰ Đđ Ơơ Ưư Ỹỹ`.
3. **Spacing**: a bar for each `--space-*` with its name.
4. **Radius, borders and shadows**: boxes on `--color-surface` with `--border-width` navy outline showing each radius and each `--shadow-chunky*`, plus one `--shadow-soft` box.
5. **Motion**
   - For each duration × easing combination that is used (at least fast/standard, normal/out, slow/spring), a "Play" button that moves a small square along a track using `transform` only.
   - Show that reduced motion shortens it: no extra logic is needed, the tokens handle it.
   - The buttons here are plain `<button>` elements styled locally. Do **not** create a shared Button component.

Developer-facing labels on `/design` (section titles, token names, "Play") may be plain English literals. This page is a dev tool excluded from prod (D-022). The Vietnamese sample sentences live in the page file as sample data. Do not add `/design` strings to `i18n/vi.ts`.

### R6. Rules that apply to every file in this task
- The only places allowed to contain raw hex, `rgb()`/`hsl()`, durations in `ms`/`s`, or `cubic-bezier()` are `tokens.css` and the Fontsource packages.
- Do not use `style` props except to set CSS custom properties as described in R5.
- Animate `transform` and `opacity` only.
- Do not modify the logic of `App.tsx`. It simply inherits the global styles.

## Acceptance criteria
- [ ] `apps/web/package.json` lists exactly `@fontsource-variable/baloo-2: 5.3.0` and `@fontsource/be-vietnam-pro: 5.3.0` as new dependencies. No other dependency changes. The lockfile still has `0` matches for `@types/node@26`.
- [ ] `http://localhost:5173/design` (dev) renders all five sections.
- [ ] `http://localhost:5173/` still shows the sanity page, now with the cream background and body font.
- [ ] DevTools Network on `/design` shows font files loaded from `localhost:5173` only, with no third-party origin.
- [ ] The diacritics stress line shows no clipped or overlapping marks at `--leading-tight`.
- [ ] Raw-literal check (command below) prints nothing.
- [ ] Production build (command below):
  - succeeds
  - `dist/assets` contains `.woff2` files
  - no emitted file contains `DesignPage` or the sample string `ẤẦẨẪẬ`
- [ ] `make check` passes (typecheck, lint, tests).

## Validation
Run these and include the trimmed output in the report:
```bash
make dev
make check

# raw literals outside tokens.css (must print nothing)
grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|cubic-bezier\(|[0-9.]+m?s\b" apps/web/src --include='*.css' --include='*.tsx' --include='*.ts' | grep -v 'apps/web/src/styles/tokens.css'

# real production build inside the container (NODE_ENV must be production, see IMPLEMENTATION_PLAN notes)
docker compose -f compose.dev.yaml run --rm --no-deps -e NODE_ENV=production install sh -c \
  'pnpm --filter @wswd/web build && ls apps/web/dist/assets | sort && \
   (grep -rl "DesignPage\|ẤẦẨẪẬ" apps/web/dist && echo "LEAK" || echo "no /design in prod build")'

grep -c "@types/node@26" pnpm-lock.yaml
```

If the raw-literal grep flags a false positive (e.g. a word ending in "s" after a number in a comment), report the exact line instead of weakening the pattern.

Afterwards delete `apps/web/dist` so no build output is left in the working tree.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/1b-1-design-tokens` from `main`.
- Make exactly **one** commit: `feat(web): design tokens, self-hosted fonts and dev-only /design page`.
- Do not commit to `main`, merge or push.
- Do not commit `.env*` files or build output.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation command output (trimmed), including the `dist/assets` listing with sizes of the `.woff2` files and the main JS/CSS bundle (gzip size from the Vite output)
4. Deviations from this handoff and why (including any font family name differences)
5. Known issues / open questions
6. What the owner should check in the browser:
   - the `/design` URL
   - which sections to look at
   - anything that looked off to you
