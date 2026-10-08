# HANDOFF 4-1 — Router, Home screen and preset case route

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first, then decisions **D-004**, **D-010**, **D-022**, **D-024**, **D-027** and **D-028** in `docs/DECISIONS.md`. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies beyond what is listed.
- Stop and report if anything conflicts.

## Context

Phase 3 delivered the case-opening screen. `App.tsx` currently mounts it with a fixed demo pool (`features/case-opening/demoPool.ts`).

Phase 4 replaces that with a real Home screen and real navigation (D-028):
- **React Router 8, declarative mode.**
- Home shows the brand, a main question, a mode selector (Solo plus locked Couple/Squad) and four preset cards.
- Tapping a preset card opens the case for that preset at `/presets/:slug`.

A later task (4-2) inserts a preview step between the card and the case. Do **not** build it here.

## Scope
- Add `react-router` and route the app: `/` Home, `/presets/:slug` case opening, `*` not found.
- Add preset data (4 presets).
- Build the Home screen: brand, question, mode selector, preset cards.
- Make `CaseOpening` take a title and a back link instead of the brand header.
- Remove the demo pool.

## Out of scope (do NOT do)
- The preset preview or option switches (4-2).
- "Recent decisions" and "Create decision". These are deferred to Phases 6 and 5 (D-028). Show no placeholder for them.
- Any API call other than the existing `ensureSession()` warm-up.
- Any change to `packages/domain`, the API, Docker or the Caddyfile.
- New shared UI primitives in `components/ui/`, and new design tokens. If a token is truly missing, stop and report.
- Changing the carousel, the celebration or the animation timing.

## Allowed dependencies
- `react-router@8.4.0`, pinned exactly, in `apps/web` `dependencies`. Reason: D-028.
- Nothing else. Do not add `react-router-dom`; v8 ships everything in `react-router`.

## Files to create / modify
- `apps/web/package.json` and `pnpm-lock.yaml`: add `react-router` `8.4.0`.
- `apps/web/src/App.tsx` → **move** to `apps/web/src/app/App.tsx` (`git mv`). It keeps the `ensureSession()` warm-up and renders `<Routes>`.
- `apps/web/src/main.tsx`:
  - wrap `<App />` in `<BrowserRouter>`
  - update the import path
  - keep the dev-only `/design` pathname check exactly as it is (D-022). `/design` stays outside the router.
- `apps/web/src/app/NotFoundPage.tsx` and `.module.css` (new).
- `apps/web/src/features/presets/presets.ts` (new): preset data plus `findPreset(slug)`.
- `apps/web/src/features/presets/PresetCasePage.tsx` (new): the route component for `/presets/:slug`.
- `apps/web/src/features/home/HomePage.tsx` and `.module.css` (new).
- `apps/web/src/features/home/ModeSelector.tsx` and `.module.css` (new).
- `apps/web/src/features/case-opening/CaseOpening.tsx` and `.module.css`: add the `title` and `backTo` props and remove the brand header.
- `apps/web/src/features/case-opening/demoPool.ts`: **delete**.
- `apps/web/src/i18n/vi.ts`: new keys, and a changed `spinAgain`.

You may extract a `PresetCard` component next to `HomePage` if it keeps `HomePage` readable. Do not create other files.

## Requirements

### R1 — Router
- `main.tsx` renders `<BrowserRouter><App /></BrowserRouter>` in the non-`/design` branch.
- `app/App.tsx`:
  - keeps `useEffect(() => { void ensureSession().catch(() => {}); }, [])`, unchanged
  - renders:
    ```tsx
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/presets/:slug" element={<PresetCasePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    ```
- Import everything from `react-router`. Use only the declarative API: no `createBrowserRouter`, loaders or actions.

### R2 — Preset data (`features/presets/presets.ts`)
```ts
export type Preset = {
  slug: string;        // URL segment, equals decision.category
  emoji: string;       // card emoji
  decision: DecisionData;
};
export const PRESETS: readonly Preset[];
export function findPreset(slug: string | undefined): Preset | undefined;
```
- Use exactly the data below.
  - Every option has `weight: 1` and `enabled: true`.
  - Decision ids are `00000000-0000-4000-8000-0000000002N0`, with N = 1..4 by preset order.
  - Option ids continue the same pattern: preset N, option k → `00000000-0000-4000-8000-0000000002Nk`, with k = 1..8.

| slug / category | card emoji | title | options (label emoji) |
|---|---|---|---|
| `food` | 🍽️ | Ăn gì? | Phở 🍜 · Bún chả 🥢 · Cơm tấm 🍚 · Bánh mì 🥖 · Lẩu 🍲 · Bún bò Huế 🌶️ · Bánh xèo 🥞 · Gà rán 🍗 |
| `drinks` | 🧋 | Uống gì? | Trà sữa 🧋 · Cà phê sữa đá ☕ · Sinh tố 🥤 · Trà đào 🍑 · Nước mía 🎋 · Nước cam 🍊 · Trà chanh 🍋 |
| `outing` | 🎡 | Đi đâu chơi? | Xem phim 🎬 · Đi dạo 🚶 · Cà phê sách 📚 · Karaoke 🎤 · Công viên 🌳 · Trung tâm thương mại 🛍️ · Bảo tàng 🏛️ · Bowling 🎳 |
| `weekend` | 🗓️ | Làm gì cuối tuần? | Ngủ nướng 😴 · Dọn nhà 🧹 · Đọc sách 📖 · Chơi game 🎮 · Nấu ăn 🍳 · Đi phượt 🏍️ · Tập thể dục 🏃 · Cày phim 📺 |

- Dev-only validation: under `if (import.meta.env.DEV)`, run `Decision.parse(preset.decision)` from `@piko/domain` for every preset at module load. An invalid preset must throw loudly in dev. Prod must not pay for it; it may tree-shake.
- `findPreset` is a plain lookup by `slug`.

### R3 — Case route (`PresetCasePage.tsx`)
- Read `slug` with `useParams()` and look up the preset.
  - Unknown slug: render `<NotFoundPage />`.
  - Known slug: render
    ```tsx
    <CaseOpening
      key={preset.slug}
      title={preset.decision.title}
      options={preset.decision.options}
      backTo="/"
    />
    ```
- `key` makes the case state reset when moving between presets.
- Set the document title with React 19's `<title>` element: `{title} · PIKO`.

### R4 — `CaseOpening` changes
- Props become `{ title: string; options: readonly DecisionOptionData[]; backTo: string }`.
- Replace the brand header (`t('title')` h1 plus tagline) with:
  - a back link: router `<Link to={backTo}>`, with an `aria-hidden` "←" followed by `t('back')`. It is placed at the start of the content column, left-aligned, as a text link, not a big button. It has a visible focus ring using the existing focus token.
  - `<h1>{title}</h1>`, with the existing header heading styles.
- Leaving the screen mid-spin must not leak a running animation. The existing unmount cleanup in `useCaseOpening` already cancels it; verify this and do not add more.
- Everything else (carousel, confetti, winner panel, button) is unchanged.

### R5 — Home (`HomePage.tsx`)
Use the same screen pattern as the case screen: `<main>`, cream background, centered column `min(100%, var(--content-max-width))`, token spacing. From top to bottom:

1. **Brand.** A `<p>` wordmark `t('title')` ("PIKO") in the display font, with the tagline `t('tagline')` below it in muted text.
2. **Main question.** `<h1>{t('homeQuestion')}</h1>` in the display size, followed by a lead paragraph `t('homeLead')`.
3. **Mode selector.** `<ModeSelector />` (R6).
4. **Quick picks.** `<h2>{t('quickPicks')}</h2>` and a list (`<ul>`) of preset cards, one per preset, in `PRESETS` order.
   - Each card is a router `<Link to={`/presets/${slug}`}>` wrapping a `<Card>`.
   - Tones rotate in this order: `primary`, `secondary`, `accent`, then back to `primary`. The 4th card is `primary` again.
   - Card content:
     - the preset emoji, large and `aria-hidden`
     - the title in the display font, `--text-xl` or larger
     - a hint line with the first three option labels joined by ", " plus "…" (e.g. "Phở, Bún chả, Cơm tấm…")
   - The link's accessible name is the title. Do not let the emoji or the hint pollute it: use `aria-hidden` on the emoji. The hint may stay in the name, but the title must come first.
   - Text color comes only from the Card tone (`--color-on-*`), all navy. No white text anywhere (CLAUDE.md contrast rules).
   - Interaction:
     - hover: lift with `translateY` (negative `--space-1`)
     - active: press down
     - focus-visible: ring with `--color-focus-ring`
     - transition on `transform` only, using motion tokens
     - reduced motion: no transform transition
   - Layout: one column below `48rem`. From `48rem`, two columns, with the Home column widened to `var(--content-wide-max-width)`, matching the case screen's media query.
- `<title>` = `PIKO — Pick. Open. Go.`, built from `t('title')` and `t('tagline')`.

### R6 — Mode selector (`ModeSelector.tsx`)
- Markup: a `<fieldset>` with `<legend>{t('modeLegend')}</legend>` and three options in a row. Each option is a `<label>` containing a native `<input type="radio" name="mode">` plus the content.
  - **Solo**: `value="solo"`, `defaultChecked`, emoji 🙋, text `t('modeSolo')`.
  - **Couple**: `value="couple"`, `disabled`, emoji 👫, text `t('modeCouple')`, plus `<Badge>` with `t('soon')`.
  - **Squad**: `value="squad"`, `disabled`, emoji 👥, text `t('modeSquad')`, plus `<Badge>` with `t('soon')`.
- No React state. Only Solo exists (D-004, CLAUDE.md rule 9).
- Visuals:
  - Chunky tiles in the mockup style.
  - The checked tile uses the primary (coral) background with `--color-on-primary-strong` text, plus border and `--shadow-chunky-sm`.
  - Disabled tiles use `--color-disabled-bg` / `--color-disabled-text` and `cursor: not-allowed`.
  - The radio input is visually hidden but stays focusable. Use a `.visuallyHidden` class in this module (clip-path pattern); do not use `display: none`.
  - The focused tile shows the focus ring (`label:has(input:focus-visible)`).
- Emojis are `aria-hidden`.

### R7 — Not found (`NotFoundPage.tsx`)
- A centered `<main>` with `<h1>{t('notFoundTitle')}</h1>` and a router `<Link to="/">` styled like a secondary button, labelled `t('backHome')`. Reuse the Button visual: render the link with the Button module classes if that is clean. Otherwise style a link locally with tokens; do not change `Button`.
- `<title>` = `{t('notFoundTitle')} · PIKO`.

### R8 — i18n (`vi.ts`)
- Add:
  - `back: 'Trở về'`
  - `homeQuestion: 'Hôm nay chọn gì?'`
  - `homeLead: 'Khỏi đắn đo, PIKO mở case chọn giùm bạn.'`
  - `modeLegend: 'Chế độ'`
  - `modeSolo: 'Một mình'`
  - `modeCouple: 'Cặp đôi'`
  - `modeSquad: 'Nhóm bạn'`
  - `soon: 'Sắp có'`
  - `quickPicks: 'Chọn nhanh'`
  - `notFoundTitle: 'Không tìm thấy trang'`
  - `backHome: 'Về trang chủ'`
- Change `spinAgain` to `'Mở lại'` (D-028).
- Remove any key that becomes unused. Check every key with `git grep`.

### R9 — Clean-up and conventions
- Delete `demoPool.ts`. No other file may reference it.
- No raw color, duration, shadow or z-index literals. Use only tokens. `48rem` in a media query is allowed because it matches the existing case-screen query.
- Animate only `transform`/`opacity`.
- No inline `style` attributes, because of the CSP. CSS custom properties through the React `style` prop are fine but should not be needed here.
- Grid items that contain wide content need `min-width: 0` (the 3-2 lesson).

## Acceptance criteria
- [ ] `react-router` `8.4.0` is the only new dependency. The lockfile changes only for it and its transitive deps.
- [ ] Routes:
  - `/` shows Home.
  - `/presets/food`, `/presets/drinks`, `/presets/outing` and `/presets/weekend` show the case with the right title and options.
  - `/presets/xyz` and `/nope` show Not found.
  - Browser Back returns from a case to Home.
- [ ] `/design` still works in dev, and is still absent from the prod bundle.
- [ ] Home matches R5/R6: brand, question, mode selector (Solo checked; Couple/Squad disabled with "Sắp có"), and four preset cards with rotating tones.
- [ ] Keyboard: Tab reaches the Solo radio, then each preset card, all with visible focus. Disabled radios are skipped.
- [ ] `demoPool.ts` is gone. `git grep -n "demoPool\|DEMO_POOL"` is empty.
- [ ] No horizontal page scroll at 360 px and 1280 px wide. Check the real geometry: no element's `getBoundingClientRect().right` exceeds the viewport width. Checking `scrollWidth` alone is not enough.
- [ ] `make check` passes.

## Validation
Run and include the output in the report:
```bash
make check
git grep -n "demoPool\|DEMO_POOL"
git grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9]+ms\b|rgba?\(" -- apps/web/src/features apps/web/src/app
docker compose -f compose.dev.yaml exec -T web pnpm --filter @piko/web build   # report main JS kB gz before/after (dev-container build: compare relative size only)
git diff --stat main...HEAD
```
- The literal grep must return nothing new.
- After installing the dependency, restart the dev web container so Vite picks it up: `docker compose -f compose.dev.yaml restart web` (see `docs/ENVIRONMENTS.md`). If the container's `node_modules` volume does not see the new package, run the install the way `docs/ENVIRONMENTS.md` describes, and report what you ran.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Git
- Create branch `feat/4-1-router-home` from **`feat/phase-4-home`**, the integration branch.
- Use small, logical commits (e.g. dependency + router, presets + case route, home, cleanup). Use conventional messages in English.
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed), including:
   - main JS size before and after, in kB gz
   - the geometry check result at 360 px and 1280 px
4. Deviations from this handoff and why
5. Known issues / open questions
6. **PHASE READY FOR VISUAL REVIEW.** What the owner should check at `localhost:5173`:
   - Home on a phone width and a desktop width: hierarchy, tile and card look, tone rotation
   - the mode selector: Solo selected, the other two clearly locked
   - each preset card opens the correct case; "Trở về" and browser Back return to Home
   - a full spin plus celebration still works from a preset
   - `/nope` shows Not found
