# Implementation Plan

## Status
- **Current phase:** Phase 8 — Polish (D-035). All tasks done; waiting for the owner's Phase 8 walk-through before merging into `main`. Phase 7 merged into `main` on 2026-10-10.
- **Integration branch:** `feat/phase-8-polish`
- **Completed:** Phase 0 — Discovery (decisions D-001…D-017); Phase 1a (1a-1, 1a-2); Phase 1b (1b-1, 1b-2); 1c-1 rebrand to PIKO; 1c-2 format gate; Phase 2 (2-1, 2-2); Phase 2.5 (spike, duration tuned to 8 s); Phase 3 (3-1, 3-2: case opening + celebration, merged into `main`); Phase 4 (4-1, 4-2: router, Home, presets, preview, merged into `main`); Phase 5 (5-1…5-4: decisions API, builder, saved decisions, reuse options, merged into `main`); Phase 6 (6-1…6-5b: history, result actions, share links, merged into `main`); Phase 7 (7-1…7-5: navigation shell, sidebar, case overlay, responsive pass, dev access from other devices, merged into `main`)

## Phases

| # | Phase | Status | Notes |
|---|---|---|---|
| 0 | Discovery | ✅ done | Greenfield; architecture in DECISIONS.md, ops in ENVIRONMENTS.md |
| 1a-1 | Monorepo + API skeleton + Docker dev | ✅ done | `1a-1-monorepo-dev-foundation.md` + `1a-1-fix-1.md` |
| 1a-2 | Docker prod (Caddy, migrate, hardening, backup/rollback) | ✅ done | `1a-2-docker-prod.md` + `1a-2-fix-1.md` (merged `1d98559`) |
| 1b-1 | Tokens + fonts + dev-only `/design` | ✅ done | `1b-1-tokens-fonts-design-page.md` (merged `3513f2c`) |
| 1b-2 | UI primitives in `/design` | ✅ done | `1b-2-ui-primitives.md` (`5ec3629`) + `1b-2-fix-1.md` (`9503c43`) |
| 1c-1 | Rebrand to PIKO: full `wswd` → `piko` rename | ✅ done | `1c-1-rebrand-piko.md` (D-023, `d44cca4`) |
| 1c-2 | Prettier in `make check` + drop unused `@` alias | ✅ done | `1c-2-format-gate.md` (`2a38aaa`) |
| 2-1 | Domain model + zod/mini + seeded selection engine | ✅ done | `2-1-domain-model-selection.md` (D-024, D-025, `6a61954`) |
| 2-2 | Animation plan math (strip, stop offset, timeline params) | ✅ done | `2-2-animation-plan.md` (D-006, D-026, `af1004f`) |
| 2.5 | Case-opening spike | ✅ done (`2-5-fix-1.md`; duration tuned to 8 s) | `2-5-case-spike.md`: throwaway tuning playground in `/design#case-spike`; the owner tunes `ANIMATION_PLAN_DEFAULTS`; folds in the 2-2 `pickWeighted` nit |
| 3-1 | Case-opening core | ✅ done (`3-1-fix-1.md`) | `3-1-case-carousel.md`: state machine, carousel, `revealAtMs`, reduced motion, mounted in `App.tsx`, spike removed (D-027) |
| 3-2 | Reveal celebration | ✅ done (`3-2-fix-1.md`, `3-2-fix-2.md`) | Winner pop + dim, in-house confetti, winner panel (D-027) |
| 4-1 | Router + Home + preset case route | ✅ done (`39e7baa`) | `4-1-router-home.md`: React Router 8, Home (brand, question, mode selector, 4 preset cards), `/presets/:slug` case, not found (D-028) |
| 4-2 | Preset preview | ✅ done (`4-2-fix-1.md`, `89fe5cc`) | `4-2-preset-preview.md`: includes the 4-1 clean-up (C0) and a `BackLink` primitive. Preview screen with option switches, `?off=` in the URL, case moves to `/presets/:slug/open` (D-028) |
| 5-1 | Decisions API | ✅ done (`5-1-fix-1.md`, `5-1-fix-2.md`, `60387fc`) | `5-1-decisions-api.md`: `decisions` table (options as JSONB), CRUD routes requiring a session, ownership, 100 per user, PGlite service tests (D-029) |
| 5-2 | Builder screen | ✅ done (`5-2-fix-1.md`, `ea973cf`) | `/decisions/new` and `/decisions/:id/edit`: title, options (add/edit/remove), emoji picker, priority dots, shared schema validation, explicit Save, non-blocking save error (D-029) |
| 5-3 | Saved decisions | ✅ done (`5-3-fix-1.md`, `58e5f14`) | `/decisions/:id` preview (Sửa/Xóa with inline confirm) + `/open` case, Home "Của bạn" (create card + saved cards), a create lands on the preview. Shared `features/preview/` (preview, `?off=` helpers) used by presets too; `useDecisionRecord` shows the state record, then refetches (D-029) |
| 5-4 | Reuse existing options | ✅ done (`5-4-fix-1.md`, `5-4-fix-2.md`, `aa21530`) | Preset "Tùy chỉnh" (`/decisions/new?from=<slug>`) and builder "Thêm từ có sẵn", which copies options from presets/saved decisions (D-029) |
| 6-1 | History API | ✅ | `6-1-history-api.md`: `decision_sessions` table (snapshot + `SelectionResult`, re-checked on the server), `POST/GET /api/history`, 200 per user, PGlite tests (D-030) |
| 6-2 | Result actions | ✅ (`6-2-fix-1.md`, `6-2-fix-2.md`) | `6-2-result-actions.md`: "Đi thôi" (save to history, best-effort), "Mở lại", "Không phải hôm nay" (exclude and respin), on every case screen (D-030) |
| 6-3 | History UI | ✅ (`6-3-fix-1.md`) | `6-3-history-ui.md`: Home "Gần đây" (5 newest) + `/history` (D-028, D-030) |
| 6-4 | Shares API | ✅ (`6-4-fix-1.md`) | `6-4-shares-api.md`: `shared_cases` table, owner routes (create with lifetime, list, revoke, record a spin), public read route without a session (D-030) |
| 6-5a | Share UI + public page | ✅ (`6-5a-fix-1.md`) | `6-5a-share-ui.md`: "Chia sẻ" dialog (lifetime, Web Share / copy), later spins recorded, `/s/:id` (options, replay, "Tự quay thử", unavailable page) with no session bootstrap; extracts `Sheet` and `WinnerPanel` (D-030) |
| 6-5b | Shared links list + revoke | ✅ (`6-5b-fix-1.md`) | `6-5b-shared-links.md`: "Link đã chia sẻ" in `/history` (title → `/s/:id`, winner, expiry) with an inline revoke confirm; `Button variant="danger"` (D-030) |
| 6-6 | Live viewing + interactions | ⏸ moved | Deferred to the Realtime phase (D-031) |
| 7-1 | Navigation shell | ✅ (`7-1-fix-1.md`) | `7-1-navigation-shell.md`: layout route + screen shell (back link at one position), mobile top bar, desktop sidebar frame from `64rem`, focus mode on case screens, `/s/:id` outside; replaces the copied screen layouts (D-032) |
| 7-2 | Sidebar lists + desktop Home | ✅ (`7-2-fix-1.md`) | "Của bạn" and "Gần đây" in the sidebar (reload on route change), Home drops both sections from `64rem` (D-032) |
| 7-3 | Case overlay | ✅ (`7-3-fix-1.md`, `7-3-fix-2.md`) | The case opens as a modal overlay above the preview/builder (nested `/open` routes, full-screen on phones, × / Esc / Back to close), focus mode removed, plus the 7-2 carry-overs (C0) (D-033) |
| 7-4 | Responsive pass | ✅ (`07a7a25`) | Every screen at 360 / 768 / 1024 / 1280 / 1920 after the overlay: carousel, winner reveal, CTAs, card grids, option layout |
| 7-5 | Dev access from other devices (opt-in) | ✅ (`7-5-fix-1.md`) | `7-5-dev-lan-optin.md`: `DEV_WEB_BIND` adds port 5173 on one LAN IP through `compose.dev.lan.yaml` (`127.0.0.1` is always kept), and `COMPOSE_DEV` uses `--env-file .env.dev`. Fix-1: Tailscale Serve on the host, and `DEV_EXTRA_ORIGINS` (a list) feeds both the API origin check and Vite `allowedHosts` (D-034) |
| 8-1 | Case polish | ✅ (`4fc838b`) | `8-1-case-polish.md`: marker line fades at the reveal, no overlay scroll at 1280×800, option monogram (`OptionGlyph`), no scroll on initial focus (D-035) |
| 8-2 | Interaction states | ✅ (`ae4d957`, owner fix) | `8-2-interaction-states.md`: hover/pressed on every interactive surface, loading that keeps space, focused error field, case focus after the reveal and at a respin (D-035) |
| 8-3 | Consistency + layout | ✅ (architect cleanup) | `8-3-consistency-layout.md`: empty/not-found CTAs, History empty alignment, sidebar "Gần đây" on error, active styles, sticky preview CTA on phones, scroll the active sidebar row into view, "Sổ tay" rows without an emoji (D-035) |
| 9 | First prod release | ⬜ | Deploy `v0.1.0` to VPS, verify backup/rollback |
| — | Final engineering review | ⬜ | Format per master prompt §47–48 |
| R | Realtime: live viewing + Couple/Squad | ⬜ | After `v0.1.0` (D-031). One design for rooms, presence, viewer/participant identity, anti-spam and server-ordered spins; live viewing of shared links (from D-030) is its first consumer. Couple/Squad still need their own approval (CLAUDE.md rule 9). |

## Next tasks (Phase 1a)
1. Root: `package.json` (workspaces), `pnpm-workspace.yaml`, `tsconfig.base.json`, ESLint, Vitest, `.env.example`, `.dockerignore`.
2. `packages/domain` skeleton (zod schemas for user/session API).
3. `apps/api`: Hono app, `/api/healthz`, guest-session middleware, Drizzle schema (`users`, `sessions`), migrations, `migrate.ts`.
4. `apps/web`: Vite + React skeleton, dev proxy `/api` → api.
5. `docker/Dockerfile` (multi-stage targets: dev, api-prod, web-prod), `docker/Caddyfile`.
6. `compose.dev.yaml`, `compose.prod.yaml`, `Makefile`.
7. Validate: `make dev` works with HMR; `make prod-build` and a local prod run work. Check image sizes.

## Review log
- **1a-1 (2026-10-07):** acceptance criteria met per report and verified by the architect (`make check` passes; stack running).
  - Found 2 MUST issues: duplicate guest per first visit (verified in DB), and corepack re-downloading pnpm in every container run.
  - Found 3 SHOULD issues: `@types/node` 26 vs Node 22, error log flooding on 4xx, hard-coded DB fallback credentials.
  - Bundle 151 kB gz flagged for investigation.
  - Fixes in `docs/handoffs/1a-1-fix-1.md`.
- **1a-1-fix-1 (2026-10-07):** all fixes verified by the architect.
  - First visit now creates exactly 1 guest.
  - pnpm runs offline.
  - `@types/node` is 22.x.
  - No stack traces on 4xx.
  - No credential fallback.
  - `make check` passes.
  - Bundle finding: the 151 kB gz figure was a **development React build**. `.env.dev` sets `NODE_ENV=development` and Vite honors it during `vite build`. With `NODE_ENV=production`, the real bundle is **300 kB min / 90.7 kB gz** (React ≈ 68 kB gz, zod classic ≈ 22.5 kB gz). This led to D-020 (zod/mini).
  - **Phase 1a-1 accepted.**
- **1a-2 (2026-10-08):** the stack works locally, per the report and the architect's inspection:
  - migrate gate, healthy services, SPA fallback, JSON 404 for `/api`
  - security headers, read-only api with `CapEff=0`, XFF spoof blocked (429)
  - backup mode 600, restore round-trip, local rollback, dev untouched
  - Not tested: the build **from a git tag**, because the handoff forbade commits. This was the architect's mistake in the handoff.
  - Accepted deviation: `setcap -r /usr/bin/caddy`. Non-root Caddy needs it under `cap_drop: ALL` + `no-new-privileges`. It costs a 52 MB copy-up layer.
  - Image sizes accepted: api 186 MB (the `node:22-alpine` base is about 160 MB; deleting npm in a later layer cannot shrink it), web 119 MB. The 150/60 MB soft targets were unrealistic.
  - MUST: a failed `pg_dump` is silent and `prod-deploy` migrates without a backup; the tag-based acceptance is still missing.
  - SHOULD: caddy gets the DB password through `env_file`; a missing `/assets/*` file returns `index.html` with an immutable cache header; a same-tag redeploy overwrites the rollback target.
  - NICE: `DOCKER_BUILDKIT=1` is on the wrong command.
  - Fixes in `docs/handoffs/1a-2-fix-1.md`. Implementer commits are allowed on `feat/1a-2-prod-docker` only.
- **1a-2-fix-1 (2026-10-08):** F1–F7 verified per report and architect re-check (`make check` 7/7, `make prod-config` OK, no secrets in the commit, rc tags/`.deploy/`/images cleaned up).
  - Tag acceptance: build from `v0.0.1-rc.1`, rc.2 deploy with automatic backup, same-tag redeploy keeps `previous`, rollback rc.2 → rc.1.
  - Accepted deviations: `@types/node@22.20.5` also in `apps/web` (removes every Node 26 peer resolution); explicit `respond 404` for missing assets so security headers stay.
  - New SHOULD, deferred to tech debt: `prod-deploy` only backs up when the `db` container is **running**.
  - **Phase 1a-2 accepted.** Fast-forward merged into `main`.
- **1b-1 (2026-10-08):** tokens match the spec exactly, including contrast comments. Fonts are self-hosted (no CDN). `/design` is absent from the prod build. No raw literals outside `tokens.css`; `style` is only used to set CSS variables. `make check` passes. Prod JS went from 90.7 to 91.7 kB gz.
  - The owner reviewed `/design` in the browser and accepted it.
  - SHOULD (dev page only): the Motion demo square never moves, because `translateX(calc(100% - 1rem))` uses the square's own width. Folded into 1b-2 (R0) on the owner's choice.
  - NICE: the Play button hover uses navy text on coral-700 (3.9:1). Primitives in 1b-2 use a transform "press" effect and never darken the background.
  - **1b-1 accepted.** Fast-forward merged into `main`.
- **1b-2 (2026-10-08):** all acceptance criteria met. Architect re-check: `make check` passes, raw-literal grep clean, `px` grep only the prose line, `/design` absent from the prod build, main JS 91.70 kB gz (+0.0), CSS 2.08 kB gz. Primitives follow the spec: native elements, tokens only, press pattern via transform, D-008 contrast respected, no hard-coded strings, no barrel, no forwardRef.
  - The owner checked `/design#components` and `/design#motion` in the browser (visuals, keyboard, ARIA state) and accepted them.
  - SHOULD: `ComponentsSection.module.css` duplicates the `/design` section chrome; the modes chip group has `aria-label` on a role-less `div`.
  - NICE (cleanup): dead CSS (`transform: none` on disabled, default grid/align rules, an overridden flex selector), Switch `.disabled` class duplicating `:disabled`, redundant `?? ''` / `: ''` in class merging, needless prop destructuring in Chip, two demo nits.
  - DO NOT TOUCH: `.visually-hidden` sized with `--border-width-thin`; Switch geometry; unused reserve tokens (`--z-*`, `--ease-in`, `--font-weight-medium`, `--shadow-offset-lg`).
  - Fixes in `docs/handoffs/1b-2-fix-1.md` (pure cleanup, no visual change), one extra commit on `feat/1b-2-ui-primitives`.
  - Note for Phase 4: a mutually exclusive choice (mode selector) is a radio-group pattern, not `aria-pressed` toggle chips. Decide the primitive when building the mode selector.
- **1b-2-fix-1 (2026-10-08):** C1–C6 verified against the diff (`9503c43`, 11 files, +18/−79). `make check` passes, both literal greps and both cleanup greps clean, `/design` absent from prod. The prod bundle is byte-identical (same hashes: JS 91.70 kB gz, CSS 2.08 kB gz), which confirms the primitives are tree-shaken and the cleanup changed no shipped code.
  - **1b-2 accepted.** Fast-forward merged into `main`. **Phase 1 complete.**
- **1c-1 (2026-10-08):** full `wswd` → `piko` rename (21 files, +57/−53) verified against the diff.
  - `git grep` for old names outside `docs/` is clean. The lockfile diff only renames `@wswd/domain`, with no version changes.
  - Architect re-check: `make check` passes, `make prod-config` passes. The live dev stack `piko-dev` returns health ok, the cookie is `piko_sid` (HttpOnly, SameSite=Lax, 1 year), and the title is "PIKO — Pick. Open. Go.". No `.env.dev`/`.env.prod` in the commit.
  - Implementer report: prod images `piko-api` 186 MB / `piko-web` 119 MB (unchanged), main JS 91.72 kB gz (+0.02 for the tagline), no `/design` leak.
  - Handoff mistake (architect): the leftover grep scanned the gitignored `.env.prod`, which the handoff also forbade editing. The implementer correctly stopped. It was resolved by switching to `git grep` (tracked files only). Lesson: acceptance greps for tracked content use `git grep`.
  - Owner follow-ups:
    - update `.env.prod` (user/db `piko`), `chmod 600`, delete `.deploy/`
    - remove the old `wswd-dev-*` images and `wswd-dev_*` / `wswd-prod_*` volumes
  - **1c-1 accepted.**
- **End-of-Phase-1 review (2026-10-08, architect, whole repo on `main` = `origin/main` `3efe6ea`):**
  - Clean:
    - no old brand names outside docs; historical mentions are intentional
    - no secrets in history; `pnpm audit --prod` finds no known vulnerabilities
    - layering respected (`web`/`api` → `domain` only, domain framework-free)
    - prod hardening, Caddy CSP/headers, guest session (hashed token, CSRF + Origin + JSON, rate limit) and ownership scoping as decided
  - The GitHub repo `duypham2801/Piko` is **public**. It has no LICENSE (default: all rights reserved) and no README (owner decision pending).
  - SHOULD: Prettier is configured but not enforced. Six code files have drifted. Fix in `1c-2-format-gate.md`, which adds `format:check` to `check` and ignores Markdown.
  - NICE: the `@` → `src` alias in Vite/tsconfig is unused. Removed in 1c-2.
  - DO NOT TOUCH:
    - `resetSession()`, kept on purpose for logout/linking (1a-1-fix-1)
    - the Be Vietnam Pro 500 import and the reserve tokens
    - zod classic in `packages/domain`, converted at the start of Phase 2 (D-020)
  - Known tech debt (unchanged): `prod-deploy` skips the backup when the `db` container is stopped. Fix before Phase 9.
  - CSP note for Phase 3: `style-src 'self'` blocks inline `style` attributes in HTML, but not CSSOM/WAAPI writes from JS (React `style`, `element.animate`). The carousel approach is unaffected.
- **1c-2 (2026-10-08):** verified against the diff (`2a38aaa`, 10 files, +54/−75).
  - `.prettierignore` ignores `*.md`. `check` now runs `format:check`, and `make check` passes with it.
  - The six code files have formatting-only changes. The `@` alias is gone from Vite and tsconfig. The `alias` grep hit only `-webkit-font-smoothing: antialiased`, a false positive.
  - NICE, not worth a fix: Prettier wraps the `--color-on-primary` line in `tokens.css` awkwardly because of its trailing comment. Move the comment above the line the next time `tokens.css` is touched.
  - **1c-2 accepted.** Fast-forward merged into `main`.
- **Phase 2 kickoff (2026-10-08):** the owner decided D-024 and D-026, and the architect recorded D-025 as a default.
  - D-024: options have label + emoji; weights 1–5 with a UI; 2–20 options, label ≤ 40.
  - D-025: mulberry32 PRNG, uint32 seed, `weighted-v1` algorithm tag.
  - D-026: seeded stop offset.
  - Phase 2 is split in two:
    - 2-1: model, zod/mini and selection
    - 2-2: animation-plan math
  - No topology change: no service, route or table is involved.
- **2-1 (2026-10-08):** verified against the diff (`6a61954`, 15 files, +439/−7).
  - Architect re-check: `make check` passes. Tests: domain 26 (3 files), api 7.
  - The `from 'zod'` grep shows only `apps/api/src/env.ts`. The global-random/time grep in the domain is clean. No lockfile change.
  - The prod web build has no `/design` leak. **Main JS dropped from 91.72 to 76.98 kB gz (−16 %)**, confirming D-020. CSS is unchanged at 2.08 kB.
  - The schemas match D-024: NFC + trim before the length checks, limits come only from `DECISION_LIMITS`, and each cross-field check has its own stable code. The PRNG matches the golden values.
  - Accepted deviation: the emoji regex is written as alternatives instead of a character class, to satisfy ESLint `no-misleading-character-class`. Behavior is the same.
  - NICE, folded into 2-2:
    - N1: `select.ts` has a dead `firstCandidate` guard that repeats the "two enabled options" error. Return from inside the weighted walk, and after the loop throw an invariant `Error`.
    - N2: the `select` golden table lacks seed `42 → b`, which the handoff listed.
    - N3: the weighted-distribution test repeats six `expect` lines. Use the same loop shape as the equal-weights test.
  - DO NOT TOUCH:
    - the fallback ids in the test helpers, required by `noUncheckedIndexedAccess`
    - the unused `weightDefault`, which the Phase 5 builder will use
    - the three separate `superRefine` checks, one per issue code
  - Note for Phase 5: zod skips the object-level refinements while any field is invalid. The builder therefore shows the cross-field errors (duplicates, too few enabled) only after the field errors are fixed. This is acceptable UX, but keep it in mind.
  - **2-1 accepted.** Merged into the integration branch `feat/phase-2-core-domain`, not `main` (owner workflow: `main` only receives finished features).
- **2-2 (2026-10-08):** verified against the diff (`af1004f`, 8 files, +374/−21, all inside `packages/domain`).
  - Architect re-check: `make check` passes. Tests: domain 38 (5 files), api 7.
  - The global-random/time/classic-zod grep is clean. No lockfile change.
  - The math matches the handoff:
    - the plan PRNG stream is salted and draws in the specified order
    - filler cells are pure weighted draws, and the winner's neighbours exclude the winner
    - `floor(stopPosition) === winnerIndex` holds for every tested seed
    - `positionAt` returns exactly `stopPosition` at the end
    - the curve has a continuous velocity and a smooth stop
  - N1–N3 from 2-1 are done: `pickWeighted` is the only weighted walk, seed 42 is in the golden table, and the distribution test uses a loop. The `select` golden values are unchanged.
  - Seed-42 pin: `winnerIndex` 51, `stopOffset` 0.2911521795205772.
  - NICE, to fold into the next handoff that touches the domain:
    - `pickWeighted` validates the weights after it has already drawn a PRNG value. Validate first.
    - Its final `throw` is now only reachable for an empty list, but it reuses the "positive integer weights" message. Give the empty case its own message.
  - DO NOT TOUCH:
    - the early `t ≤ 0` return in `spinProgress`, which also guards against `accelFraction = 0`
    - the `ids`/`makeOption` fixtures duplicated in `select.test.ts` and `plan.test.ts`; two copies do not justify a shared fixtures module
  - Open for Phase 2.5: the tail looks long on paper (about 0.6 cells in the last 2 s). Tune `decelPower`, `durationMs` and the spin length in the browser.
  - **2-2 accepted. Phase 2 complete** on `feat/phase-2-core-domain`.
- **2-5 (2026-10-08):** reviewed `feat/2-5-case-spike` (5 files, +824/−5).
  - `make check` passes. Tests: domain 40 (6 files), api 7.
  - The literal greps are clean. The report gives no `/design` leak and main JS at 76.98 kB gz, both unchanged.
  - R0 (`pickWeighted` validates before drawing, plus 2 tests) is accepted.
  - The spike is built as specified:
    - the domain plan drives it
    - frames are written through refs
    - a `ResizeObserver` keeps the item-unit position
    - the primitives and tokens are reused
  - MUST: the winner cell is outlined in the idle state and during the whole spin, so the result is visible before the stop. This defeats the feel review.
  - SHOULD:
    - the readout `<pre>` has React children and is also written through `textContent`
    - `aria-label` sits on role-less `div`s (the same rule as 1b-2 C2)
  - NICE:
    - a redundant `initialPlan` memo
    - a per-cell `.find`
    - `: ''` class merging
    - the 20 rem viewport height (tall, narrow cells)
  - Fixes in `2-5-fix-1.md`, as one extra commit on `feat/2-5-case-spike`. The task branch is rebased onto the integration branch so that it contains the fix handoff.
- **2-5-fix-1 (2026-10-08):** F1–F6 verified against the diff (2 files, +23/−17). `make check` passes.
  - The winner outline appears only after the stop. The readout `<pre>` has no JSX children. The cells no longer carry `aria-label`. `initialPlan`, `.find` and `: ''` are gone, and cells are close to square (10 rem).
  - Unrequested deviation, accepted: the implementer also removed `role="group"` + `aria-label` from the Pool/Speed chip groups. Those labels were valid, but the section is throwaway (deleted in Phase 3), so it is not worth a fix.
  - **2-5 accepted.** Merged into `feat/phase-2-5-case-spike`.
- **Owner tuning (2026-10-08):** the owner played the spike and changed only `durationMs` from 6000 to 8000. With the owner's explicit permission, the architect applied this one-line change directly in `ANIMATION_PLAN_DEFAULTS`. D-026 is updated.
- **End-of-Phase-2.5 cleanup review (architect, whole repo on the integration branch):**
  - `make check` passes. Tests: domain 40, api 7.
  - The literal greps are clean, apart from the allowed prose line. No unused files or dependencies. Every i18n key is used, some through dynamic `t(status)`. Layering is respected.
  - NICE, for the first Phase 3 handoff: the domain `index.ts` exports `createRng` and `spinProgress`, but nothing outside the domain needs them. Seeds come from `crypto` in the web, and `positionAt` wraps the curve. Unexport both and keep them internal.
  - DO NOT TOUCH: the other domain exports with no consumer yet (`Decision`, `DecisionOption`, `DECISION_LIMITS`, `SelectionResult`, `Seed`, `SELECTION_ALGORITHM`). They are the public API for the builder (Phase 5) and for history (Phase 6).
  - Phase 3 will delete the spike section (`CaseSpikeSection.*` and its `/design` nav link). It is about 800 lines of throwaway dev code.
  - Phase 3 must decide when the reveal starts, because the 8 s tail looks stopped about 1.5 s early (see D-026).
- **3-1 (2026-10-08):** reviewed `feat/3-1-case-carousel` (17 files, +685/−912).
  - Architect re-check: `make check` passes. Tests: domain 42, api 7.
  - The web-scoped greps are clean.
  - The report gives seed-42 `revealAtMs` = 6864 ms, main JS 79.62 kB gz (+2.6 kB for the feature) and no `/design` leak.
  - Accepted:
    - the domain `revealAtMs` bisection (no extra PRNG draw, so the pins are unchanged)
    - the pure reducer
    - refs-only frames, with the reveal dispatched once and the loop running on to `durationMs` (no snap)
    - the reduced-motion slide driven by the token transition
    - `ResizeObserver` re-application
    - the background `ensureSession()`
    - the spike and the debug strings removed; `createRng`/`spinProgress` unexported
  - Deviation accepted: `/api/healthz` remains in `apps/api` (used by the prod healthcheck). The handoff grep should have been scoped to `apps/web` (architect mistake).
  - SHOULD:
    - F1: the viewport clips the card shadows and the winner lift, because the strip is exactly one cell tall.
    - F2: desktop is capped at 30 rem, and the media `max-width: 48rem` has no effect.
    - F3: the preview plan is built twice (hook and screen).
    - F4: `--case-cell-width` is defined twice.
  - NICE:
    - the unused `reset` event (specified too early by the architect)
    - the hook imports the carousel CSS module for a class name; switch to a `data-motion` attribute
    - a duplicate `min-height`
    - a nested `aria-hidden`
  - Fixes in `3-1-fix-1.md`, which adds one layout token `--content-wide-max-width: 60rem`. The task branch is rebased onto the integration branch.
- **3-1-fix-1 (2026-10-08):** F1–F7 verified against the diff (8 files, +16/−35). `make check` passes. The report gives main JS 79.61 kB gz.
  - The owner reported that after the spin no result appeared and the button stayed disabled.
  - The architect reproduced it in headless Chrome over CDP. The dev server was serving a **stale `packages/domain` module**: its exports still included `createRng`/`spinProgress`, and `ANIMATION_PLAN_DEFAULTS` had no `revealThresholdItems`. So `plan.revealAtMs` was `undefined` and the reveal never fired.
  - The files inside the container were current. Vite's module cache had missed the changes after the architect rebased the task branch under the running dev server.
  - `docker compose -f compose.dev.yaml restart web` fixed it.
  - Re-verified in headless Chrome:
    - normal motion reveals at about 6.9 s
    - the button re-enables and shows "Quay lại"
    - a second spin works
    - the cell under the marker is the winner and carries the winner class
    - reduced motion reveals almost immediately after the short slide
  - **Code is correct, so no code fix is needed.** `ENVIRONMENTS.md` now has a note to restart `web` after switching branches.
  - Lesson (architect): avoid rebasing the task branch while the owner's dev server runs, or tell the owner to restart `web` afterwards.
  - The "no end effect" part of the report is expected: the celebration is 3-2.
  - **3-1 accepted.** Merged into `feat/phase-3-case-opening`.
- **3-2 (2026-10-08):** reviewed the diff (9 files, +218/−19). `make check` passes (42 domain tests, 7 api tests). Literal greps are clean. The report gives main JS 80.18 kB gz.
  - Accepted:
    - the four tokens
    - pop/dim
    - 20 deterministic CSS-keyframe confetti pieces
    - the accent `Card` winner panel inside the live region
    - reduced motion (no confetti)
  - **MUST F1: the page renders blank.**
    - The new `.stage` wrapper is a grid item with `min-width: auto`, so it grows to the strip's max-content width (7.5–10k px). Everything sits off-screen.
    - `overflow-x: clip` on `.screen` hid the scrollbar, so the implementer's `scrollWidth` check passed.
    - Headless Chrome measured `.content` at left 3552 px (360 px viewport) and 4592 px (1280 px viewport).
    - Fix verified in the browser: `.stage { min-width: 0 }` and remove the clip.
  - SHOULD:
    - the redundant `dimmed` prop (specified by the architect)
    - `styles[piece.shape]` points to a nonexistent `.strip` class
  - NICE: `text-align: start`.
  - Fixes in `3-2-fix-1.md`.
  - Lesson: runtime checks must measure element geometry, not only `scrollWidth`.
- **3-2-fix-1 (2026-10-08):** the diff is 4 files (+9/−10).
  - Verified:
    - `.stage { min-width: 0 }`, and the clip is removed
    - the `dimmed` prop is removed
    - the confetti `dot: boolean`
    - `text-align: start`
  - The report gives `make check` passing, 80.16 kB gz, and geometry 360 → 16/328 and 1280 → 160/960.
  - **Accepted.** Fast-forwarded `feat/phase-3-case-opening` to `feat/3-2-celebration`.
  - Owner visual review: "the marker always stops at the same part of the cell". The architect measured 6 spins at 0.21–0.79 of the cell, within the `stopBand` 0.6 band (±0.3).
  - The owner chose `stopBand` 0.9, uniform with no edge bias (D-026 revised). Handoff `3-2-fix-2.md`.
- **3-2-fix-2 (2026-10-08):** the diff is the 2 domain files. `stopBand` is 0.9. In the seed-42 pin, `stopOffset` changed from 0.29115… to 0.43673…, while `winnerIndex` 51 and the strip are unchanged.
  - Unlisted deviation: the implementer deleted the exact `revealAtMs` pin instead of updating it.
  - With owner approval, the architect restored it directly as `toBe(6_865)` (commit `test(domain): pin the seed-42 reveal time at 6865 ms`).
  - `make check` passes (42 domain tests, 7 api tests).
  - The owner is satisfied with the visuals. **3-2 accepted.** Fast-forwarded into `feat/phase-3-case-opening`.
- **Phase 4 kickoff (2026-10-08):** the owner decided the router (React Router), the preset flow (preview before the case), the scope (no Recent or Create on Home until Phases 6 and 5) and the four presets. Recorded as D-028.
  - Architect note: v8 (8.4.0) has been current since 2026-06, so it is pinned instead of v7. The declarative exports were verified in the published package.
  - Phase 4 is split in two. 4-1 covers the router, Home and the preset case route. 4-2 covers the preview.
  - Integration branch: `feat/phase-4-home` from `main`.
- **4-1 (2026-10-08):** verified against the diff (17 files, +584/−82, 3 commits).
  - `make check` passes. `react-router` 8.4.0 is the only new dependency; the lockfile adds only `cookie-es` and `@remix-run/route-pattern` as transitive deps.
  - Routes, presets (data matches the handoff, with dev-only `Decision.parse`), Home, mode selector, not found and `CaseOpening` title/back link all match R1–R9. `demoPool` is gone, the literal grep is clean, and `/design` is still dev-only.
  - Bundle: main JS 80.16 → 95.12 kB gz (+15 kB). This is the expected cost of React Router (D-028), and is accepted.
  - The owner checked it in the browser: OK.
  - SHOULD (folded into 4-2 C0, owner choice):
    - dead `.header p` rule in `CaseOpening.module.css`
    - a 4-entry tones list that would repeat primary at the 5th card
    - redundant `aria-disabled` on a native disabled radio
    - a local `.visuallyHidden` duplicating the global `visually-hidden`. Architect mistake: the 4-1 handoff asked for a local class.
  - NICE (also in C0):
    - hover lift sticks on touch, so gate it with `@media (hover: hover)`
    - the card press should drop the shadow like the large Button
    - `position: relative` on the mode tile
  - DO NOT TOUCH:
    - `PresetCasePage` imports `NotFoundPage` from `app/`; that is acceptable for one screen
    - the NotFound link styled locally rather than through `Button`, which the handoff allowed
  - **4-1 accepted.** Fast-forwarded into `feat/phase-4-home`.
- **4-2 (2026-10-08):** verified against the diff (15 files, +301/−47, 3 commits). `make check` passes and the clean-up grep is empty.
  - C0–C4 match the handoff:
    - the 4-1 clean-up is done
    - `BackLink` is in `/design` (via `MemoryRouter`)
    - `parseOff`/`formatOff`/`applyOff`, with `applyOff` using the `enabled` flag (no filtering)
    - the preview with a URL-only state and `replace`
    - the case at `/open` with Back keeping the search string
  - SHOULD (`4-2-fix-1.md` F1): on hover-capable devices the press does not work. The `@media (hover: hover)` hover rule comes after `:active` with the same specificity, so hover + active lifts the card (`-4px`) instead of pressing it (`+5px`). The architect measured this by forcing the pseudo-states in Chrome. It came from the C0 split; the handoff did not specify the order.
  - NICE (in fix-1):
    - F2: memoize the case `options`, because `applyOff` returns a new array on every render
    - F3: one row modifier instead of two computed class strings
  - **Owner feedback (2026-10-09), back link position:** the back link moves between screens.
  - Measured:
    - at 390 px, the case screen puts it at y=130 instead of 32, because its content is centred vertically
    - at 1280 px, it sits at x=153 (preview), 160 (case) and 393 (builder), following each screen's column width
  - The architect proposed a shared screen shell with a fixed top bar right after 5-2-fix-1.
  - **The owner chose to keep it for Phase 7**, together with the screen-shell extraction below. Phase 7 must place the back link at the same position on every screen.
- Deferred to Phase 7: the screen shell (`.screen`/`.content` plus the `48rem` wide-column query) is now copied in Home, Preview, CaseOpening and NotFound. Extract a shared layout when the responsive pass designs desktop. Four copies make this a real reuse boundary, but its shape belongs to Phase 7.
  - DO NOT TOUCH: the defensive minimum guard in `updateOption`, kept even though the switch is disabled.
- **4-2-fix-1 (2026-10-08):** verified against the diff (`89fe5cc`, 4 files, +31/−21). `make check` passes and the grep is clean.
  - F1: the `:active` rules now come after the hover media block. The architect re-measured in Chrome: hover `-4px`, active `+5px`, hover + active `+5px`.
  - F2: the case `options` are memoized on `formattedOff` + preset. `off` is parsed twice (once outside the memo for the key, once inside). That is harmless and keeps the hook deps honest. DO NOT TOUCH.
  - F3: the row uses a single `data-off` modifier, and the switch is not dimmed.
  - **4-2 accepted.** Fast-forwarded into `feat/phase-4-home`.
  - The owner reviewed the Home → preview → case flow in the browser and approved it. **Phase 4 complete.** Merged into `main` with `--no-ff`.

- **Phase 5 kickoff (2026-10-08):** integration branch `feat/phase-5-builder` created from `main`. Decisions in D-029.
  - Owner: explicit Save (no autosave), five priority dots per option, saved decisions in a Home "Của bạn" section, curated native-emoji picker, preset "Tùy chỉnh", PGlite for API tests.
  - Default: one `decisions` table with JSONB options, 100 decisions per user, decision routes require an existing session and never create a guest, 404 for other users' decisions, no category UI.
  - Split into 5-1 (API + domain draft schema), 5-2 (builder), 5-3 (decision preview/case, Home list, delete, preset customize).
  - The owner approved updating `TOPOLOGY.md` with the planned table and routes, marked as in progress.

- **5-1 (2026-10-08):** reviewed `feat/5-1-decisions-api` (6 commits, 21 files, +1009/−18).
  - Architect re-check: `make check` passes. Tests: domain 44, api 18. The migration is additive only (one table, the FK, one index).
  - Accepted:
    - `DecisionDraft` and `Decision` share one field shape and the three refinements
    - every query filters by `user_id`; the user-row `FOR UPDATE` lock before the count
    - `allowGuestCreation: false` returns 401 without touching the limiter (tested: no user row created)
    - malformed ids are a 404; `invalid_json`/`invalid_body`/413 are tested
    - deviations: `Database` = `PgDatabase<PgQueryResultHKT, typeof schema>` with no casts, and `AppDependencies.sql` narrowed to `unsafe()` for a typed test stub
  - MUST (`5-1-fix-1.md` F1): **PGlite ships in the prod api image** (25.2 MB; image 186 → 211 MB). It is an optional peer of drizzle-orm, so pnpm resolves a drizzle-orm variant that depends on it, and `pnpm deploy --prod` installs it. The 5-1 check only looked at the top-level `node_modules/@electric-sql`. The architect's handoff command was too weak to catch this.
    - Fix: delete it after `deploy` and add a build guard.
  - SHOULD (F2): the narrowed SQL type is written inline twice (`app.ts`, `health.ts`), and `Sql` in `db/client.ts` is now dead.
  - NICE (F3):
    - one route test only re-parses the same 404 body
    - the fixture keeps an `optionIds` list that the index template already produces
  - DO NOT TOUCH:
    - classic `zod` for `z.uuid()` in `routes/decisions.ts`, the same as `env.ts`
    - the service test storing an untrimmed draft: it proves the service stores what it is given; the route parses first
    - `beforeEach` deleting all users in the test files
  - Notes for 5-2:
    - the global middleware requires `Content-Type: application/json` and `Origin` on **every** mutation, including a body-less `DELETE`
    - a 401 `session_required` (expired or cleared cookie) should call `resetSession()`, then `ensureSession()`, and retry once

- **5-1-fix-1 (2026-10-08):** verified against the diff (`8c357b8`, `2d6177c`). `make check` passes. Tests: domain 44, api 17. The report gives an image of 185.8 MB, no `electric-sql` path, and a working `postgres-js` import.
  - F2 and F3 are accepted: `HealthSql` is defined once, `Sql` is deleted, the 404 test parses `ApiError`, and the fixture uses only the template.
  - SHOULD (`5-1-fix-2.md`): F1 works, but it does 18 lines of symlink surgery and copies drizzle-orm into a hand-named `drizzle-orm@0.45.3_postgres@3.4.9`, with hard-coded versions.
    - Root cause: an architect mistake in the fix-1 guard ("any path whose **name contains** `electric-sql`"), which also matches the harmless name of the drizzle-orm variant directory.
    - The architect verified a simpler fix on a throwaway build: delete only `@electric-sql` and `.pnpm/@electric-sql+*`, and guard on those names plus `pglite.wasm`. Nothing is left, `postgres-js` imports fine, and `node_modules` is 29.3 MB.
  - Also: a blank line is missing before `FROM … AS api-prod`.

- **5-1-fix-2 (2026-10-08):** verified against the diff (`60387fc`, Dockerfile only, +4/−15 versus fix-1). Compared with `59d2dd1`, the step is the comment, `deploy`, one `find … rm` and the guard. There are no hard-coded versions.
  - Architect re-check:
    - `make check` passes (domain 44, api 17)
    - the `api-prod` image built from `HEAD` has no `@electric-sql`, `@electric-sql+*` or `pglite.wasm` path, imports `drizzle-orm/postgres-js`, and is 185.8 MB
    - the dev DB has the `decisions` table
  - **5-1 accepted.** Fast-forwarded into `feat/phase-5-builder`.

- **5-2 handoff (2026-10-08):** the owner approved two empty options as the builder start. Architect defaults, recorded in D-029:
  - "Mở case" is always available in the builder. It opens the current draft in place (`?view=case`), so a save failure never blocks a decision.
  - Until 5-3, a create lands on `/decisions/:id/edit`, with the record passed in the router state.

- **5-2 (2026-10-09):** reviewed `feat/5-2-decision-builder` (2 commits, 15 files, +1204/−3).
  - Architect re-check:
    - `make check` passes, and the literal and `style=` greps are clean
    - the builder was driven in headless Chrome at 360 and 1280 px
  - Prod bundle: main JS 96.47 → **100.70 kB gz** (+4.2 kB), measured with `NODE_ENV=production`. The 164 kB in the report was a dev build.
  - Accepted:
    - the API client: one shared response parser; `withSession` resets the session and retries once on 401 `session_required`
    - the `AbortController` load with 404 → Not found
    - duplicate labels computed in the web (both rows are marked while another field is empty)
    - focus goes to the first invalid input
    - "Mở case" opens in place under `?view=case`, and Back returns to the form with the draft intact
    - no overflow at 360 px with a long label and the panel open
    - the 40 emoji are checked against the schema in dev
  - MUST (`5-2-fix-1.md` F1):
    - **After a create, Save is stuck on "Đang lưu…" (disabled), and the title stays untrimmed** (reproduced). The form has no `key`, so React reuses the `/new` instance on `/:id/edit`; the handoff asked for one.
    - The router state record is never refreshed after an update, so a reload shows the content from the create.
  - SHOULD:
    - F2 (reproduced): "Kiểm tra lại các ô…" stays after every error is fixed, because it is stored as a status instead of derived
    - F3 (screenshot): `display: contents` puts the emoji panel between the trigger and the label input, which breaks line 1 of the row
    - F4: `draftOf`, the empty-option factory and the option input id each exist twice
  - NICE (F5): the `messages` injection in `formErrors.ts`, `<title>` repeated in five returns, `OptionRow` borrowing `DecisionForm.module.css`.
  - The report claimed "Save, edit và save lại" passed, but the architect reproduced the opposite.

- **5-2-fix-1 (2026-10-09):** verified against the diff (`41dd691`, `ea973cf`, 9 files, +228/−296). `make check` passes.
  - The architect re-ran the flows in headless Chrome:
    - create → `/edit` shows "Đã lưu", the trimmed title and an enabled Save
    - edit → the status clears; save → "Đã lưu"
    - reload → the latest values
    - after a failed attempt, a valid draft clears "Kiểm tra lại…"
    - at 360 px with the emoji panel open, the trigger and the input stay on one line with the panel below, and there is no overflow
    - `Escape` closes the panel and focuses its trigger
  - F4/F5 are done: `draft.ts` is the single source, `formErrors` uses `t()`, `<title>` renders once, and `OptionRow.module.css` exists. No unused CSS class is left in the builder modules.
  - The report gives a prod main JS of 100.60 kB gz.
  - NICE, folded into 5-3: `FormErrors.form` is computed but never read, because the status line derives "form invalid" from `parsed.success`. Remove the field and its branches.
  - **5-2 accepted.** Fast-forwarded into `feat/phase-5-builder`.

- **5-3 handoff (2026-10-09):** the owner agreed to split the end of Phase 5 into 5-3 (saved decisions) and 5-4 (preset "Tùy chỉnh" + "Thêm từ có sẵn").
  - Architect defaults:
    - the preset preview/case UI is extracted once (`features/preview/`) and reused, not copied
    - saved-decision pages show the router-state record at once and always refetch, so they are never stale after Back and still work offline (rule 5)
    - delete uses an inline confirm row, not a dialog
    - Home "Của bạn" starts with a dashed "Tạo quyết định" card in the same grid

- **5-3 (2026-10-09):** reviewed `feat/5-3-saved-decisions` (5 commits, 25 files, +809/−279). `make check` passes (domain 44, api 17). The report gives a prod main JS of 101.74 kB gz.
  - The architect drove these flows in headless Chrome:
    - Home "Của bạn": the create card plus saved cards, most recent first
    - create → `/decisions/:id` (no loading flash) → `?off=0` → case → Back keeps `?off=0`
    - Sửa → save → browser Back shows the **edited** title (refetch)
    - delete: focus goes to Hủy, Hủy returns focus to Xóa, and confirming lands on Home with the card gone
    - unknown and malformed ids → Not found; `/decisions/new` → builder
  - Screenshots: Home at 1280 px and the confirm row at 390 px look right.
  - Accepted:
    - `features/preview/` (`DecisionPreview`, `off.ts`, `useOffOptions`), with the preset pages as thin wrappers and the CSS moved, not copied
    - `useDecisionRecord` + `DecisionLoadState` shared by the builder, preview and case
    - `apiDelete` with `Content-Type`; a 404 on delete is treated as gone
  - MUST (`5-3-fix-1.md` F1): revert `8c57316`. It is an out-of-scope confetti rewrite: 20 classes of magic numbers replace the computed geometry.
    - It was triggered by an **architect mistake**: the handoff grep checked `style=` across all of `features/`.
    - React `style` custom properties are allowed (the CSP note from 1c). Future handoffs scope the `style=` grep to new files only.
  - NICE:
    - F2: `useDecisionRecord` stores a `retry` closure only to replace it, and refetches whenever the router state changes, which costs one extra `GET` per builder save
    - F3: `initialStatus` in `DecisionForm` is dead
    - F4: the Home map destructures the record and then rebuilds it
    - F5: preview rows without an emoji keep an empty grid column, so the labels are indented by one gap

- **5-3-fix-1 (2026-10-09):** verified against the diff (`82df9a8` revert, `58e5f14`).
  - `features/case-opening` is identical to `feat/phase-5-builder`.
  - `useDecisionRecord`:
    - errors are stored without a closure
    - the fetch effect depends on `id` + retry only, and the state record is read through a ref
    - the report shows 1 `GET` before and after a builder save
  - `initialStatus` is gone. The Home map passes the record as is. Preview rows without an emoji drop the empty column (`data-no-emoji`).
  - Architect re-check: `make check` passes. The full Chrome flow passes again: create → preview → off → case → Back → edit → Back shows the edited title → delete → Home.
  - **5-3 accepted.** Fast-forwarded into `feat/phase-5-builder`.

- **5-4 handoff (2026-10-09):** architect defaults, recorded in D-029:
  - "Tùy chỉnh" copies **all** preset options (the preview's `?off=` is not carried over), and an unknown `from` falls back to an empty draft
  - "Thêm từ có sẵn" is an inline panel with one `<details>` per decision and `Chip`s per option
    - chips whose label is already in the draft are selected and disabled
    - a chip first fills an empty row, then appends
    - saved decisions are fetched only when the panel opens, and the decision being edited is excluded
  - The validation grep is now scoped to the changed files, after the 5-3 confetti incident.

- **5-4 (2026-10-09):** reviewed `feat/5-4-reuse-options` (`91ad413`, 10 files, +390/−23). `make check` passes (domain 44, api 17). The report gives a prod main JS of 102.73 kB gz.
  - Accepted:
    - `normalizeLabel` is the single normalization, also used by `formErrors`
    - `draftFromPreset` and `withCopiedOption` are pure; the chip dedupe is by normalized label
    - the panel mounts `useDecisionList` only when open, so saved decisions are fetched on demand, excluding the edited one
    - "Tùy chỉnh" is a single-class wrapper child
    - the builder case back link keeps the search but drops `view` (an unreported but correct deviation: it keeps `?from=` on Back from the case)
  - **Owner decision:** "Thêm từ có sẵn" must be a floating modal, not an inline panel. The architect agrees, because the list can be long and inline it fights the sticky action bar.
    - Spec (`5-4-fix-1.md` M1/M2): a native `<dialog>` with `showModal()`, a bottom sheet on phones and centred from 48rem, a sticky header, a page scroll lock and a new `--color-backdrop` token.
    - No shared `Dialog` primitive until a second modal exists.
  - SHOULD (F1): a create navigates to `/decisions/${id}${location.search}`, so a create from `?from=food` leaves `?from=food` on the preview URL.
  - NICE (F2): `findPreset` is called twice in `DecisionBuilderPage`, and the new-option literal is repeated in `draft.ts` instead of reusing `emptyOption()`.

- **5-4-fix-1 (2026-10-09):** verified against the diff (`eea31ef`, `8e45320`, 8 files, +157/−87). `make check` passes.
  - Measured by the architect in Chrome:
    - 390 px: a bottom sheet (`x=0`, width 390, bottom-anchored)
    - 1280 px: a centred dialog (`x=400`, width 480)
    - a backdrop click closes it and focuses the toggle; no overflow
  - Accepted:
    - native `showModal()` (no custom trap), `aria-labelledby`, a sticky header and scrolling body
    - the scroll lock via `:root:has(dialog[open])`
    - `--color-backdrop` (`color-mix`) is listed in `/design`
    - a create drops the search; `findPreset` is called once; `emptyOption()` is reused
  - SHOULD (`5-4-fix-2.md`, screenshot): already-added chips are `selected` + `disabled`, and `Chip`'s `:disabled` paints them grey. "Added" therefore looks like "blocked by the limit", and the teal selected state never shows.
    - Fix: a `.selected:disabled` rule in the primitive (shown in `/design`) and a `✓` mark.
  - NICE:
    - only the chip's `disabled` state guards against duplicates: three same-label clicks in one task produced `Phở | Bún | Phở`. Guard inside the updater.
    - the `handleClose` wrapper, the unused `existingOptionsPanelId`, and `useCallback` on `closeExisting`

- **5-4-fix-2 (2026-10-09):** verified against the diff (`aa21530`, 4 files, +25/−11). `make check` passes (domain 44, api 17). Grep clean.
  - `Chip`: `.selected:disabled` keeps the teal selected look; the unselected disabled chip stays grey; `/design` shows both.
  - Added chips show `✓`. The updater checks the limit and the normalized label on the current draft: the architect's same-task script with four chips now yields `Phở | Bún`.
  - `handleClose`, `existingOptionsPanelId` and the `useCallback` are gone.
  - Architect screenshot at 390 px: teal `✓ Phở` / `✓ Bún` chips in the bottom sheet.
  - **5-4 accepted. Phase 5 code complete** on `feat/phase-5-builder`.

- **Phase 5 merge (2026-10-09):** the owner reviewed the full Phase 5 flow in the browser and approved it. The owner ran the merge and push, because the architect's merge command was blocked by the auto-mode classifier.
  - `main` = `1ea2663` (`--no-ff`; parents `21ba825` + `da7672c`) = `origin/main`.
  - Architect re-check on `main`: `make check` passes (domain 44, api 17), `/api/healthz` reports ok with the db ok, and the web returns 200.
  - **Phase 5 complete.**

- **Phase 6 kickoff (2026-10-09):** HITL decisions recorded in D-030 (refines D-009; adds an approved exception to CLAUDE.md rule 9).
  - The owner chose:
    - history on "Đi thôi" only
    - Home "Gần đây" + `/history`
    - "Không phải hôm nay" excludes and respins at once
    - share as a **public link** with the option list, replay and "Tự quay thử", available as soon as the result is revealed
    - a lifetime chosen when sharing, plus revoke
    - **live viewing with viewer interaction**
  - The owner asked whether LiveKit/WebRTC fits live viewing. The architect advised against it: the spin is deterministic from the seed, so a tiny event is enough and no media needs streaming. The owner chose SSE + POST.
  - Split into 6-1…6-6, with live viewing last. Integration branch `feat/phase-6-result-history` created from `main` (`36a32ed`). Topology updated (owner approved).
  - Handoff `6-1-history-api.md` written.

- **6-1 (2026-10-09):** reviewed `feat/6-1-history-api` (4 commits `185ee3f`…`bb52d8c`, 14 files, +1167/−6). `make check` passes (domain 47, api 28). Lockfile and `apps/web` unchanged.
  - Architect check: `\d decision_sessions` in the dev DB shows the 2 indexes and the FKs (`ON DELETE CASCADE` on user, `ON DELETE SET NULL` on decision). The migration is generated and additive only.
  - Accepted:
    - `matchesSelection` re-runs `select` and compares algorithm, winner and candidates in order; returns `false` on a throw
    - the service rejects mismatches before the transaction, locks the user row, links only owned decisions and prunes in list order
    - every query filters by `user_id`
    - the routes are thin, with `invalid_query` / `invalid_json` / `invalid_body` / `invalid_result`
    - the middleware is renamed to `requiredSession` / `jsonBodyLimit` and shared by `/api/decisions` and `/api/history` (allowed by the handoff)
  - SHOULD (`6-1-fix-1.md`):
    - the POST route re-parses its own response with `HistoryEntry.parse`, unlike the decisions routes
    - the `match.test.ts` "candidates differ" test disables every option, so it only tests the throw path
  - NICE (same fix):
    - pruning loads every id and slices; use `offset`
    - a redundant route test that cannot assert the order
    - an irrelevant `decisions` assertion in the cascade test
    - a hand-typed source union in the test helper
  - DO NOT TOUCH: the `/api/history/*` mount (no sub-routes yet, harmless and consistent with decisions).

- **6-1-fix-1 (2026-10-09):** verified against the diff (`a04582e`, 5 files, +24/−32). `make check` passes (domain 48, api 27).
  - `POST` returns the typed entry with no re-parse. `HistoryEntry.parse` remains only in the route test.
  - Pruning selects only the overflow with `offset`; the pruning test still passes.
  - `match.test.ts` has a real candidate mismatch (two options still enabled) plus a separate test for the throw path.
  - The redundant route test and the irrelevant assertion are gone; the test helper uses `HistorySourceInputData`.
  - **6-1 accepted.**
- **6-2 (2026-10-09):** reviewed the two implementer commits (rebased onto the review docs) (10 files, +252/−50). `make check` passes (domain 48, api 27); lockfile unchanged; literal gate empty.
  - **Browser (headless Chrome, reduced motion):**
    - at 360, 390 and 1280 px: "Mở case" → "Không phải hôm nay" down to two candidates (button disabled, hint shown) → "Mở lại" keeps the exclusions → "Đi thôi" → `201`
    - with `?off=0` the snapshot has option 0 `enabled: false`
    - no horizontal scroll
    - a blocked `/api/history` request shows the error with every action still enabled; a new spin clears it; a retry saves
  - **SHOULD:** the spin options live in a separate `spinOptionsRef` that each `open` caller must set. They should travel with `plan`/`result` in the state machine.
  - **NICE:**
    - the exclusion mapping is written twice
    - the status line has `min-height: --tap-target-min` plus an `:empty` reset
    - `spinAgain` also handles "Mở case"
  - **For the owner's visual review (copy, not fixed):**
    - the hint "Cần ít nhất 2 lựa chọn." when two remain
    - after saving, both "Đã lưu" (button) and "Đã lưu vào lịch sử." (line) show
  - **DO NOT TOUCH:** `withSession` moved to `session.ts`; the save is not blocked by other actions; stale responses are ignored via a request counter.
  - → `6-2-fix-1.md`.
- **6-2-fix-1 (2026-10-09):** verified (`a99f7a9`, 4 files).
  - The spin options now travel in the case-opening state with `plan`/`result`; `spinOptionsRef` is gone; one `excludeOptions` helper.
  - `make check` passes (domain 48, api 27). The browser re-run at 360/390/1280 px and the blocked-save flow give the same results as 6-2.
  - **Owner visual review:** two copy changes.
    - The hint with two left reads "Chỉ còn 2 lựa chọn cuối." (new key; the preview keeps `minOptionsHint`).
    - The success line is visually hidden but kept in the live region, so the "Đã lưu" button is the only visible confirmation.
  - → `6-2-fix-2.md`.
- **6-2-fix-2 (2026-10-09):** verified (`2d79d07`, 3 files).
  - The hint reads "Chỉ còn 2 lựa chọn cuối."; the preview keeps `minOptionsHint`.
  - After saving, the live region has `visually-hidden` and only "Đã lưu" shows; a failed save still shows the error line.
  - `make check` passes (domain 48, api 27).
  - NICE, not fixed: the hint's DOM id is still `case-min-options-hint`.
  - **6-2 accepted.**
- **6-3 (2026-10-09):** reviewed the two implementer commits (11 files, +358/−3). `make check` passes (domain 48, api 27); lockfile unchanged; literal gate empty.
  - **Browser (headless Chrome, 360 and 1280 px):**
    - Home sends `GET /api/history?limit=5` and `/history` sends `GET /api/history`, each after the single `/api/me`
    - Home shows 5 rows, `/history` shows all, with no horizontal scroll
    - preset entries link to `/presets/<slug>`; a saved-decision entry links to `/decisions/<id>` and stops being a link once that decision is deleted; a draft entry is not a link
  - **NICE:**
    - `formatHistoryTime` builds day keys from `formatToParts`, where comparing the local year, month and day is enough
    - `.recent` repeats the grid rules of `.yourDecisions`/`.quickPicks`
  - **For the owner's visual review:** the `--border-width-thin` (2 px) dividers look heavy; where "Gần đây" sits on Home.
  - **DO NOT TOUCH:** the shared `HistoryList` (one `Card`, rows as `Link` or `div`); `useHistoryList` with `retry`.
  - **Owner visual review:**
    - make the dividers thinner → `6-3-fix-1.md`, with a hairline width and a `--color-divider` token, plus the two NICE items
    - the owner asked for a sidebar holding "Của bạn" and "Gần đây". **Deferred to the start of Phase 7** (owner, HITL): the app has no navigation shell yet, and Phase 6 still adds `/history` "Link đã chia sẻ" and the public `/s/:id`, so the shell is designed once, after Phase 6
- **6-3-fix-1 (2026-10-09):** verified (`3dd3470`, 5 files).
  - Dividers use `--border-width-hairline` (1 px) and `--color-divider` (navy 15 %); both are listed in `/design`.
  - `formatHistoryTime` compares local calendar days; the Home section rules are merged.
  - `make check` passes (domain 48, api 27).
  - The literal gate flagged existing `style=`/`px` samples in the dev-only `DesignPage.tsx`. That is a false positive of the gate, which should exclude `pages/design/` in future handoffs.
  - **NICE (Phase 8 polish):** rows whose winner has no emoji start further left than rows with one.
  - **6-3 accepted.**
- **6-4 (2026-10-09):** reviewed the four implementer commits (12 files, +1464). `make check` passes (domain 48, api 41); lockfile unchanged.
  - The migration `0003` is additive: `CREATE TABLE shared_cases`, one FK (cascade), one index.
  - **Dev:**
    - the public route returns 404 with `cache-control: no-store` and no `set-cookie`, for both a valid-looking and a malformed id
    - `/api/shares` without a cookie returns 401
  - Every owner query filters by `user_id`. The spin check compares ids, order, label, emoji and weight. Expired rows are pruned on create.
  - **SHOULD:**
    - `notFoundError` is defined three times and the uuid check twice
    - the "read JSON → `invalid_json`, `safeParse` → `invalid_body`" block is written four times across the decisions, history and shares routers
    - These are now a real reuse boundary → `lib/http.ts`.
  - **NICE:** the public handler catches the service's `HttpError(404)` and rebuilds the body only to add `Cache-Control`. A `null` return plus `c.header` is simpler.
  - **DO NOT TOUCH:** one `SharedCase` shape for owner and public responses (it has no user field); revoke deletes the row.
  - → `6-4-fix-1.md`.
- **6-4-fix-1 (2026-10-09):** verified (`9f82567`, 6 files, +68/−138). `make check` passes with the same counts (domain 48, api 41); route tests are unchanged.
  - `lib/http.ts` (`notFoundError`, `parseUuidParam`, `readJsonBody`) is used by the decisions, history and shares routers.
  - `getPublicShare` returns `null`; the public handler sets `Cache-Control` once and has no `try`/`catch`. Dev: 404 with `no-store`, no cookie.
  - The public route keeps an inline `z.uuid()` check, because it must answer 404 itself instead of throwing. Accepted.
  - **6-4 accepted.**

- **6-5 kickoff (2026-10-09):** split into 6-5a (share dialog, recording later spins, public `/s/:id`) and 6-5b (shared links list + revoke), owner approved. Handoff `6-5a-share-ui.md`.
  - Architect defaults: the app-wide `ensureSession()` effect moves into a `SessionLayout` route so `/s/:id` never bootstraps a session; spins after sharing are recorded at spin start (best-effort, silent); the public page lists enabled options only, keeps the real shared result visible next to local "Tự quay thử" spins, and sets `noindex`.
  - Reuse boundary reached: a second modal, so `ExistingOptionsPanel`'s dialog shell becomes `components/ui/Sheet`; the winner card becomes `WinnerPanel` for the case screen and the public page.
- **6-5a review (2026-10-09):** verified on `feat/6-5a-share-ui` (3 commits, 21 files). `make check` passes (domain 48, api 41); no dependency change; the session grep shows only `SessionLayout.tsx`; the literal grep is empty.
  - Browser (headless Chrome, 360/390/1280, reduced motion and normal motion):
    - "Chia sẻ" → 7 days preselected → one `POST /api/shares` with the spin options and result.
    - Reopening shows the same link with no new request. `Esc`, a backdrop click and "Đóng" close the dialog and focus returns to "Chia sẻ".
    - The copy-failure fallback selects the link.
    - "Mở lại" and "Không phải hôm nay" each make one `POST …/spins`.
    - `/s/:id` in a fresh browser context: only `GET /api/public/shares/:id`, no cookie, `users` count unchanged (47 → 47), `noindex`, enabled options only, no weights.
    - Replay lands on the shared winner (normal and reduced motion); three "Tự quay thử" spins sent nothing and the shared result line did not change.
    - A malformed id and an unknown UUID show "Link này không còn khả dụng".
  - SHOULD (`6-5a-fix-1.md`):
    - three states for one share snapshot in `CaseOpening`
    - `ShareDialog`: a local copy of the lifetime type, a redundant `activeRef`, and a `data-` attribute queried twice
    - the public stage stays at `--content-max-width` on desktop, unlike the case screen
    - the option list uses a bordered box per option, heavier than the history list the owner approved
  - NICE (same fix):
    - an empty status band in dialog step 2
    - the verbose seed block in `open`
    - the import order in `CaseOpening`
    - the wrapper around the latest-result line
    - an empty emoji span when an option has none
  - Note for the Realtime phase (was 6-6): spin records are fire-and-forget, so two quick spins could reach the server out of order and leave the older one as "latest". Live viewing must order spins (e.g. by start time) when it adds the broadcast.
  - DO NOT TOUCH: the focus return by element id (same pattern as `DecisionForm`), the `NotFoundPage` `title`/`message` props, and the duplicated `screen` layout CSS (the Phase 7 shell will own it).
- **6-5a-fix-1 (2026-10-09):** verified against the diff (`b8e076e`, 6 web files). `make check` passes (domain 48, api 41); the handoff greps and the literal grep are empty.
  - `CaseOpening` keeps one `shareSnapshot`. `ShareDialog` uses the domain lifetime type, one `requestRef` guard and the link field id; the status line renders only with a message.
  - Browser:
    - Step 2 of the dialog has no empty band at 1280.
    - The copy fallback still selects the link. `Esc` returns focus to "Chia sẻ", and "Mở lại" records one spin.
    - On `/s/:id` the stage is 960 px wide at 1280 while the actions stay at 480. The option list is one card with hairline dividers. No horizontal scroll at 360. No cookie.
  - 6-5a accepted.
- **6-5b handoff (2026-10-09):** `6-5b-shared-links.md`.
  - Architect defaults:
    - "Link đã chia sẻ" sits above the history list and is hidden when empty (D-028); the history list gets an "Đã chọn" heading.
    - Each row's title opens `/s/:id`; the meta line shows the latest winner and the expiry.
    - Revoke uses an inline confirm like the decision delete; a `404` counts as revoked.
    - No copy/re-share action in the list.
  - Reuse boundary reached: a second red confirm button, so `Button` gets `variant="danger"` and the decision delete stops hand-styling its button.
- **6-5b review (2026-10-09):** verified on `feat/6-5b-shared-links` (2 commits, 12 files). `make check` passes (domain 48, api 41); no dependency change; the `confirmDelete` and literal greps are empty.
  - Browser (360/1280):
    - A new guest sees only "Đã chọn".
    - With two links:
      - `/history` makes `/api/me`, `GET /api/history` and `GET /api/shares`.
      - The rows show the title (→ `/s/:id`), the winner and "Hết hạn …" or "Không hết hạn", with no horizontal scroll at 360.
    - The confirm focuses "Hủy", and cancel returns focus to "Thu hồi".
    - A revoke makes one `DELETE`; focus lands on "Link đã chia sẻ" and then, after the last link, on "Đã chọn".
    - `/s/:id` shows "Link này không còn khả dụng" afterwards.
    - With the api stopped:
      - the revoke shows `revokeFailed`
      - on load, both sections show their errors
    - It works after a restart.
    - The decision delete uses `Button variant="danger"` and looks unchanged.
  - SHOULD (`6-5b-fix-1.md`):
    - `SharedLinkList` keeps a `mountedRef` (not needed in React 19, already removed from `ShareDialog`) and duplicates the success path for `404`
    - `HistoryPage` moves focus after a revoke through a flag ref and an effect instead of directly in the handler
  - DO NOT TOUCH: the `confirmDelete` → `handleDelete` rename in `DecisionPreviewPage` (needed by the handoff grep); the nested label ternary in the dev-only `ComponentsSection`.
- **6-5b-fix-1 (2026-10-09):** verified against the diff (`7e6b629`, 2 files, +15/−47). `make check` passes (domain 48, api 41); the handoff grep is empty.
  - `SharedLinkList` has one success path with no mounted guard. `HistoryPage` focuses the right heading directly in `handleRevoked`.
  - Browser rerun: cancel and revoke focus are unchanged ("Link đã chia sẻ", then "Đã chọn"). A link already deleted elsewhere (`404`) disappears with no error.
  - 6-5b accepted. The implementer reported one transient PGlite setup timeout in `shares.test.ts` that passed on rerun; not reproduced in this review.
- **6-6 decision (2026-10-09):** the owner asked whether live viewing should wait, since Couple/Squad will also need live spins. Owner chose to defer (D-031): Phase 6 closes at 6-5b, and live viewing moves to a Realtime phase after `v0.1.0`, designed once with Couple/Squad. Nothing built in 6-1…6-5b is wasted: `shared_cases` keeps the latest spin and `POST /api/shares/:id/spins` is recorded at spin start.
- **Phase 6 closed (2026-10-09):** the owner did the browser review on phone and desktop and approved it. `feat/phase-6-result-history` was merged into `main` with `--no-ff`. `TOPOLOGY.md` was updated (owner approved).
- **Phase 7 kickoff (2026-10-09):** integration branch `feat/phase-7-responsive` created from `main` (`06139c3`). Decisions in D-032.
  - Owner: mobile top bar (logo, "Lịch sử", "+ Tạo"); desktop sidebar from `64rem` with "Của bạn" and "Gần đây"; Home drops both sections on desktop; case screens are focus screens with no sidebar.
  - Architect defaults: case screens also hide the mobile top bar; one layout route + one screen-shell component; sidebar lists reload on route change, no global store; `/s/:id` stays outside the shell.
  - Split into 7-1 (shell), 7-2 (sidebar lists + desktop Home), 7-3 (responsive pass per screen). No topology change.
- **7-1 review (2026-10-09):** reviewed `d0dd31a`, `0488519` (26 files, +626/−517). `make check` passes (domain 48, api 41); no dependency change; `ensureSession` only in `SessionLayout`.
  - **Browser (headless Chrome, 360/768/1024/1280):**
    - The top bar shows below `64rem` and the sticky sidebar from `64rem`.
    - `aria-current` is set on `/history`.
    - Focus mode hides the nav on the preset case, the decision case and the builder's `?view=case`.
    - Sharing still works: dialog, `Esc`, focus back on "Chia sẻ".
    - `/s/:id` has no nav, only the public GET, no cookie.
    - The back link is at one position on every shell screen.
  - **MUST:**
    - `Screen` `.content` stretches in the `1fr` row, which spreads `/history` and the public page over the full height ("Về trang chủ" about 100 px tall).
    - `align="center"` does not centre without a back link, because the content lands in the `auto` row. This affects NotFound, the load state and the public states.
  - **SHOULD:**
    - The nav's DOM order ("+ Tạo", "Lịch sử") differs from its mobile visual order (CSS `order`), so tab order runs right-to-left.
    - `overflow-x: hidden` and a repeated `display: flex` in `AppNav`.
    - Page `.content` rules repeat `Screen` defaults.
  - **Owner (HITL):** remove Home's large PIKO wordmark and move the tagline under the nav logo (D-032 note).
  - **NICE, not requested:** `data-focus={focus || undefined}`; `import type { To }`.
  - **DO NOT TOUCH:**
    - page `className` overrides of `Screen`'s `.content` rely on CSS order (each page imports `Screen` before its own module), the same as the `className` props on UI primitives
    - the dev double public GET comes from StrictMode
  - → `7-1-fix-1.md`.
- **7-1-fix-1 (2026-10-09):** verified (`fadfdaa`, 9 files, +25/−39). Lockfile unchanged.
  - **Browser at 360/1280:**
    - `/history` keeps its normal gaps; "Về trang chủ" is 44 px tall.
    - `/nope` and `/s/<unknown>` are centred vertically.
    - The case screen is unchanged.
    - Tab order: "PIKO Pick. Open. Go." → "Lịch sử" → "+ Tạo" → "← Trở về" (the accessible name keeps the space).
    - Home has no large wordmark; the nav shows the tagline under the logo; no horizontal scroll.
  - **NICE, not requested:** `.logo` keeps the redundant `gap: 0` and `align-items: start`, and `.wordmark` repeats the logo's `line-height`.
  - **`make check`:** the first run failed with PGlite `beforeAll` hook timeouts (10 s) in up to 5 api test files while the host load average was about 12. The api tests alone, and the next `make check`, passed (domain 48, api 41). This branch touches no api code. It is the same flake as in 6-5b → technical debt.
  - **7-1 accepted.** Fast-forwarded into `feat/phase-7-responsive`.
- **7-2 handoff (2026-10-09):** `7-2-sidebar-lists.md`.
  - **Architect defaults:**
    - `useMediaQuery(DESKTOP_QUERY)` (`useSyncExternalStore`) mounts the sidebar lists only from `64rem`, and Home's list sections only below it, so neither width makes duplicate list requests.
    - The list hooks take an optional reload key; the sidebar passes `pathname`, so `?off=` changes do not reload, and the current data stays visible while reloading.
    - "Của bạn" scrolls on its own; "Gần đây" shows winner + title without time.
    - Desktop Home keeps the create card alone.
- **7-2 review (2026-10-09):** reviewed `4b5c55a`, `2e83b94`, `f7b97cb`, `7ba2497` (9 files, +352/−69). `make check` passes (domain 48, api 41), with **1 lint warning**.
  - **Browser:**
    - **Requests:**
      - At 1280 px, `/` makes one `GET /api/decisions` and one `GET /api/history?limit=5`, both from the sidebar; Home renders only "Chọn nhanh".
      - At 360 px there are no nav lists and Home keeps its sections (dev StrictMode doubles its two GETs).
    - **Layout and links:**
      - Resizing across `64rem` switches the layout live.
      - The active row has `aria-current`.
    - **Reloads:**
      - `?off=` toggles make no list request.
      - "Đi thôi" → "Trở về" puts the new entry first without emptying the sidebar.
      - A deleted decision disappears after the redirect.
  - **MUST:** "Của bạn" with many decisions shows a horizontal scrollbar. `.list` is an `auto` grid column, so `nowrap` labels widen each `<li>`. The heading also scrolls away with the rows.
  - **SHOULD:**
    - `react-refresh/only-export-components` warning from exporting `historyEntryHref` in `HistoryList.tsx` (architect handoff mistake) → own module.
    - `NavLists.module.css` repeats `global.css` resets and has two heading selectors.
    - Redundant `aria-label` on the sidebar rows.
    - An unused server snapshot in `useMediaQuery`.
  - **NICE (Phase 8):**
    - the active row is not scrolled into view
    - recent rows without a winner emoji start further left (same as the 6-3 note)
  - **DO NOT TOUCH:**
    - "Xem tất cả" next to the nav's "Lịch sử" (D-032)
    - `RecentSection` returning `null` before its first load
  - → `7-2-fix-1.md`.
- **7-2-fix-1 (2026-10-09):** verified (`18451c7`, 5 files, +33/−32). `make check` passes (domain 48, api 41) with **0 lint warnings**; lockfile unchanged.
  - **Browser:**
    - With 20 saved decisions at 1280×800 and 1024×700, only the "Của bạn" `<ul>` scrolls (956/433 px); the heading stays put and "Gần đây" stays visible.
    - Every nav element has `scrollWidth === clientWidth`, and the long title ends in "…".
  - `historyEntryHref` lives in its own module; the redundant `aria-label` and server snapshot are gone.
  - **SHOULD (carried into 7-3 as C0):** the "Của bạn" `<h2>` lost its bottom spacing, because only the "Gần đây" header got `margin-bottom`. The heading now touches the list and the empty line.
  - **NICE (carried into 7-3 as C0):** `.list > li { min-width: 0 }` is redundant with `minmax(0, 1fr)`.
  - **7-2 accepted.** Fast-forwarded into `feat/phase-7-responsive`.
- **7-3 kickoff (2026-10-09):** the architect ran a responsive audit (360×740, 768×1024, 1024×768, 1280×800, 1920×1080; Home, History, preview, builder, preset, case ready and revealed).
  - **Overflow:** no horizontal overflow anywhere.
  - **Findings:**
    - The revealed case at 360×740 scrolls by about 25 px, because the result reserve (128 px) is taller than the winner panel (85–95 px).
    - On a tall window the sidebar pushes "Gần đây" to the bottom.
    - At 1920 px the case stage (60rem) leaves half the screen empty.
  - **Owner:** instead of widening the stage, open the case as an overlay above the page (D-033), closed by × or `Esc` but not by a backdrop click.
  - Phase 7 becomes 7-3 (overlay + C0 fixes) and 7-4 (responsive pass after the overlay).
- **7-3 review (2026-10-09):** reviewed `6f71ee3`, `13df3f0`, `68f2fe9` (13 files, +330/−248). `make check` passes (domain 48, api 41, 0 lint warnings); lockfile unchanged.
  - **Browser:**
    - **Opening:**
      - Nested `/open` routes keep the preview mounted, and opening makes no second record GET.
      - A deep link to `/decisions/<id>/open` shows the preview with the overlay; `/presets/nope/open` shows not-found.
    - **Closing:**
      - A backdrop click does nothing.
      - `Esc` (also mid-spin), "×" and Back close the overlay.
      - After "×", Back does not reopen it, and focus returns to "Mở case".
    - **Builder:** the overlay opens above the form, and the draft survives.
    - **Case behaviour:**
      - "Đi thôi" makes one `POST /api/history`.
      - Reduced motion reveals quickly.
      - The revealed case fits 360×740.
    - **C0:** the sidebar heading gap and the short-list placement are fixed. The panel is 86.6 / 95.8 px against a 96 px reserve.
  - **MUST:**
    - Closing the nested share `Sheet` (`Esc` or "Đóng") also closes the case overlay. React propagates the synthetic `close` event to the parent dialog's `onClose`, which navigates back, and the revealed result is lost.
    - At 360 px the "×" overlaps a long title (`1fr auto 1fr` header).
  - **SHOULD:**
    - From `48rem` the dialog always takes its full `max-height`, because the phone's `height: 100dvh` is not reset.
    - Initial focus lands on "×", because `showModal()` runs after React's `autoFocus`.
    - The "×" glyph is tiny.
  - **DO NOT TOUCH:**
    - `if (!id) return null` / `if (!preset) return null` in the case pages (unreachable guards for the type checker)
    - the case pages no longer set `<title>` (the preview's title is the same)
  - → `7-3-fix-1.md`.
- **7-3-fix-1 (2026-10-09):** verified (`e630769`, 2 files).
  - **Verified:**
    - Closing the share dialog (`Esc` or "Đóng") keeps the case overlay open with its result, and focus returns to "Chia sẻ".
    - Initial focus is on "Mở case".
    - At 360 px the title and "×" no longer overlap.
    - The "×" glyph is larger.
  - **Test note:** with CDP `Runtime.evaluate` clicks (no user activation), one `Esc` closed both dialogs. Chrome's close watcher groups dialogs opened without user activation. With real mouse input via `Input.dispatchMouseEvent`, it behaves correctly. Future nested-dialog checks must use real input.
  - **Still open (F3):** the desktop overlay is 736 px tall for 498–622 px of content. `inset: 0` makes `height: auto` stretch. `height: fit-content` was verified in the browser (568 px, centred; clamps and scrolls at 1280×500).
  - The implementer reported one transient PGlite timeout in `history.test.ts` that passed on rerun (known flake, technical debt).
  - → `7-3-fix-2.md`.
- **7-3-fix-2 (2026-10-09):** verified (`b4d0132`, one line).
  - **1280×800:** the overlay is 568 px when ready and 692 px when revealed, centred.
  - **1280×500:** it clamps and scrolls inside.
  - **360 px:** still full-screen.
  - **Note for 7-4:** because the overlay is centred and grows when the actions appear, it moves up about 60 px at the reveal. The old centred case screen did the same. Consider anchoring it to the top or reserving the actions' height.
  - **7-3 accepted.** Fast-forwarded into `feat/phase-7-responsive`.
- **7-4 audit (2026-10-09):** the architect audited Home, History, a preview, the builder, `/s/:id`, not-found and the overlay (ready and revealed).
  - **Viewports:** 360×740, 740×360, 768×1024, 1024×768, 1280×800, 1920×1080.
  - **Overflow:** no horizontal overflow anywhere. The landscape phone overlay scrolls inside (accepted).
  - **Findings:**
    - the desktop overlay moves up about 60 px at the reveal (centred, `fit-content`)
    - the overlay title wraps at 360 px (`--text-display` between two 44 px columns)
    - `/s/:id` reserves 128 px for a 96 px result panel
  - → `7-4-responsive-pass.md`. The rest goes to Phase 8:
    - emoji-less row alignment
    - scrolling the active sidebar row into view
- **7-4 (2026-10-09):** verified (`07a7a25`, 2 files, +9/−4). The implementer reported one transient PGlite timeout (`shares.test.ts`) that passed on retry (known flake).
  - **Overlay (desktop):** the top stays at 64 px and the strip at 195 px, before and after the reveal, at 1280×800 and 1920×1080. At 1280×500 it scrolls inside.
  - **360×740:**
    - "Tối nay ăn gì?" fits on one line (37 px).
    - A 45-character title wraps (147 px) without overlapping "×" (title x 68–292, button x 300–344).
    - The revealed case needs no scrolling.
  - **`/s/:id` at 360/1920:** strip → "Xem lại lượt quay" is 160 px (96 reserve + gaps), nothing moves at the reveal, and there is no horizontal scroll.
  - **NICE (Phase 8):** at 1280×500, focusing "Mở case" on open scrolls the dialog so the strip's top is hidden.
  - **7-4 accepted.** Fast-forwarded into `feat/phase-7-responsive`. Phase 7 is ready for the owner's walk-through.
- **Dev LAN change review (2026-10-10):** the owner added uncommitted LAN access for the dev web.
  - **Kept:** the API part, with `DEV_LAN_ORIGIN` (dev-only, rejected by `env.ts` elsewhere) and an exact-match origin list for the guard and `csrf()`. Its test passes. `make check` is green.
  - **Problems:**
    - `0.0.0.0:5173` is published on every interface, including Tailscale, and Docker bypasses ufw.
    - It also changes the default for everyone.
  - **Owner chose the opt-in (D-034)** → `7-5-dev-lan-optin.md`. Work happens on `fix/dev-lan-access`, then merges into `feat/phase-7-responsive`. The architect commits the docs at review.
- **7-5 (2026-10-10):** verified (`b8106bd`).
  - The changes match the handoff: Makefile `--env-file` and the conditional override, `compose.dev.lan.yaml`, and 5 env tests. API 47 tests are green.
  - Sockets were confirmed by the implementer: default localhost only, opt-in adds `192.168.6.28:5173`.
  - **New owner request:** Tailscale access too.
    - **Owner chose Tailscale Serve** (HTTPS MagicDNS name, no extra Docker port).
    - **"Domain later" = prod (Phase 9),** not a public dev URL.
  - `DEV_LAN_ORIGIN` → `DEV_EXTRA_ORIGINS` (a list), which also feeds Vite `allowedHosts` → `7-5-fix-1.md`.
- **7-5-fix-1 (2026-10-10):** verified (`f7bbcb9`).
  - `DEV_EXTRA_ORIGINS`:
    - It is trimmed, and each entry must be a bare `http(s)` origin. It is rejected outside development.
    - It feeds the API guard and `csrf()`, and Vite `allowedHosts` (never `true`).
  - API 50 tests are green, and `git grep DEV_LAN_ORIGIN` outside `docs/` is empty.
  - Checked on the host:
    - The `dp-1.tailfeab26.ts.net` Host header gets 200 and an unknown host gets 403.
    - The LAN gets 200.
    - The web is published on `127.0.0.1` + `192.168.6.28` only.
  - **Tailscale Serve:**
    - Serve first had to be enabled in the tailnet admin. The owner then ran `tailscale serve --bg 5173` (tailnet only).
    - The owner confirmed the app loads on the phone over `https://dp-1.tailfeab26.ts.net`.
    - Curl from the host itself fails to resolve the MagicDNS name, which is expected and not a defect.
  - **7-5 accepted.** `fix/dev-lan-access` merged into `feat/phase-7-responsive`.
- **Phase 7 closed (2026-10-10):** the owner did the browser walk-through and approved it. `feat/phase-7-responsive` was merged into `main` with `--no-ff`. `TOPOLOGY.md` already covers 7-5 (D-034); closing the phase changes nothing else.
  - Carried into Phase 8: emoji-less row alignment, scrolling the active sidebar row into view, and the 1280×500 focus scroll that hides the strip's top.
- **Phase 8 kickoff (2026-10-10):** integration branch `feat/phase-8-polish` created from `main` (`274c3d9`).
  - **Architect audit** (360×740 and 1280×800; Home, History, builder, presets, saved decision, case ready/spinning/revealed/"Không phải hôm nay"/"Đi thôi", share, bad link, 404; API delayed 3 s; API refused; Tab navigation):
    - no horizontal overflow, no console errors, and the app stays usable with the API down (rule 5 holds)
    1. the marker line crosses the winner's emoji and label after the reveal
    2. the overlay scrolls inside at 1280×800 when a status line shows under the actions ("Chưa lưu được…", "Chỉ còn 2 lựa chọn cuối.")
    3. options without an emoji: the strip label sits higher, the winner panel has no icon, preview labels are indented differently
    4. `Button` has no hover; `Card`, `Chip`, `Switch` and the builder controls have no hover or pressed state
    5. loading is a bare "Đang tải…" and the content then pushes the layout; the sidebar shows a lone "Của bạn" heading
    6. "Về trang chủ" is coral on the empty History page but teal on not-found and the unavailable share page
    7. History empty on desktop: the message and button are centred under left-aligned headings
    8. sidebar "Gần đây" is hidden when empty but appears on error with a "Xem tất cả" link
    9. active styles differ: "Lịch sử" uses a teal underline, list rows a lemon fill
    10. the preview "MỞ CASE" sits below every option on phones (8 rows for a preset)
    11. a focused field with an error shows the teal focus ring around the red error border
    12. carried from 7-4: scrolling the active sidebar row into view; at 1280×500 the initial focus scrolls the strip's top out of view
  - **Owner choices (D-035):** monogram for emoji-less options, sticky preview CTA on phones, loading keeps space (no skeletons), "Gần đây" stays hidden while empty, three tasks.
  - → `8-1-case-polish.md` (1, 2, 3, 12b). 8-2 gets 4, 5, 11. 8-3 gets 6–10 and 12a.
- **8-1 review (2026-10-10):** reviewed `c7512fb`, `d58cba6`, `c7ca5ca` (15 files, +170/−50). `make check` passes (domain 48, api 50, 0 lint warnings); lockfile unchanged; the literal grep is empty.
  - **Browser, re-measured by the architect:**
    - **Marker:** the line goes to opacity 0 at the reveal and is back at once on "Mở lại". The arrow heads stay.
    - **Overlay at 1280×800** (scrollHeight/clientHeight):
      - normal 642/642
      - hint 671/671
      - hint + error 692/692
      - no inner scroll in any state
    - **Overlay position:** the top stays at 64 px and the strip at 187 px before and after the reveal.
    - **360×740:** 740/740.
    - **1280×500:** `scrollTop` 0 on open, and focus is on "Mở case".
    - **Monogram:** "ẩm thực" → "Ẩ" as one character. It shows in the strip, the winner panel, the preview (labels at one x), History and the sidebar "Gần đây".
  - **Cleanup by the architect (owner asked for review + cleanup), `4fc838b`:**
    - The marker keeps its own geometry and the line just fills it (`inset: 0`), which removes the duplicated positioning.
    - "Đã lưu" no longer reserves a status row. It is announced visually hidden, so the status counts only the hint or an error. The saved state is now 642, like normal; it was 650.
    - From `48rem`, `.secondaryActions` uses the same `--space-2` as `.actions`. Before, the vertical gap was 8 px and the horizontal gap 12 px.
    - The per-site `flex: 0 0 auto` is removed, because `OptionGlyph` owns its box.
    - The sidebar glyph uses `--text-lg`, so the monogram letter is readable. At 14 px it was about 8 px.
    - `emoji ?? monogram`: the schema guarantees a non-empty emoji.
    - The rest of the repo was scanned: no dead files, unused dependencies, unused i18n keys or debug code. The flagged CSS classes are dynamic `styles[variant]` lookups, and the API `console.log`s are operational logs.
  - **Found, not caused by 8-1 (pre-existing):**
    - Focus falls to `<body>` at the reveal and at "Mở lại", because the focused button unmounts → 8-2.
    - Sidebar "Của bạn" rows of a decision with no emoji have no icon, so their labels start left of the "Gần đây" rows → 8-3.
  - **8-1 accepted.** Fast-forwarded into `feat/phase-8-polish`.
- **8-2 handoff (2026-10-10):** `8-2-interaction-states.md`.
  - **H: hover and pressed.**
    - Two tokens: `--hover-lift`, `--hover-lift-sm`.
    - Every hover sits in `@media (hover: hover)`, and none applies when disabled.
    - Movement and the existing backgrounds only, no new colours.
  - **L: `LoadingText`.**
    - It fades in after `--duration-slow`, so fast loads do not flash.
    - It is used at 5 sites, plus the sidebar "Của bạn".
    - `DecisionLoadState` loads in the final layout with the back link.
  - **E:** a red focus ring on fields with an error.
  - **F: focus stays in the case dialog.**
    - spin → the title (`tabIndex -1`)
    - reveal → "Đi thôi"
    - saved → "Mở lại"
- **8-2 review (2026-10-10):** reviewed `49c2989`, `ea58662`, `ab4a73d`, `c3e6e61` (33 files, +263/−39). `make check` passes (domain 48, api 50, 0 lint warnings); lockfile unchanged.
  - **MUST, found by the owner in the browser** ("hover affects the `type=button` controls"):
    - **Cause:** `Switch` moved the checked offset into `--switch-thumb-offset`, but `.thumb` itself no longer used it. Only the hover and pressed rules did.
    - **Effect:** every checked switch showed its thumb on the left, and it jumped right on hover.
    - **Fix:** `.thumb { transform: translateX(var(--switch-thumb-offset)) }`. Re-measured: 36 px when on, 0 when off.
  - **Verified:**
    - **Case focus:** "Mở case" → title during the spin → "Đi thôi" at the reveal → "Mở lại" after the save. It never falls to `<body>`.
    - **Hover:** every hover rule sits in `@media (hover: hover)` and none applies when disabled. This was checked by reading the CSS: headless Chrome reports `hover: none` and cannot emulate it, so the owner checks it in a real browser.
    - **Extra surfaces, accepted:** the logo underline, the "Thêm từ có sẵn" group summary, the share lifetime options.
  - **Cleanup by the architect (`ae4d957`):**
    - removed the dead `.muted` in `SharedCasePage.module.css`
    - inlined a one-line `useCallback`
    - renamed `DecisionLoadState`'s `align` to `textAlign`, because it clashed with `Screen.align`, which is vertical
  - **Owner request (D-035 amendment):** "Của bạn" → "Sổ tay" everywhere, and the sidebar section is hidden while loading/empty. This makes the 8-2 sidebar loading line moot, so it is removed (`noDecisionsYet` too).
  - **8-2 accepted.** Fast-forwarded into `feat/phase-8-polish`.
- **8-3 handoff (2026-10-10):** `8-3-consistency-layout.md`, C1–C7.
  - **C1:** "Về trang chủ" becomes a primary link-button. A `buttonClassName()` helper is exported from `Button` and applied to a router `Link`; `.backHome` is removed. This is an architect default: coral, because it is the only action on those screens.
  - **C2:** History states start-aligned.
  - **C3:** no "Xem tất cả" on a failed list.
  - **C4:** from `64rem` the current "Lịch sử" uses the lemon row style.
  - **C5:** sticky "MỞ CASE" below `48rem`.
  - **C6:** the current "Sổ tay" row is scrolled into view.
  - **C7:** `OptionGlyph` for decisions without an emoji.
- **8-3 review (2026-10-10):** reviewed `207a722`, `d2ddbd8`, `9ef849d` (12 files). `make check` passes (domain 48, api 50, 0 lint warnings); lockfile unchanged; both greps are empty.
  - **Browser, re-measured by the architect:**
    - **360×740** (`/presets/food` and a saved decision with 8 options): "MỞ CASE" is pinned at 670–728 (full width). At the end of the page the bar settles above "Sửa / Xóa" / "Tùy chỉnh" (bottom 676), and the last row ends at 486.
    - **1280:** the button is static at its natural width (152).
    - **Sidebar:** with 20 decisions, opening the oldest scrolls the list (`scrollTop` 427) so its lemon row is visible. Rows without an emoji show a monogram.
    - **Current styles:** at 1280 the current "Lịch sử" has the lemon fill with no underline.
    - **"Về trang chủ":** a coral link-button, start-aligned with "Đã chọn" (x 528) on the empty History page, and coral on not-found.
  - **Cleanup by the architect:**
    - `buttonClassName` moves to `components/ui/buttonClassName.ts` (with the `ButtonVariant`/`ButtonSize` types), so the `eslint-disable react-refresh/only-export-components` is gone. The handoff had asked for the export from `Button.tsx`.
    - It is called as `buttonClassName()`, not `({})`.
    - The preview action bar is written mobile-first (sticky by default, static from `48rem`). It was the repo's only `max-width` media query.
    - Hovering the current "Lịch sử" keeps its lemon fill (`:not([aria-current='page'])`), like the sidebar rows.
  - **NICE (later):** a disabled but checked `Switch` (minimum options reached) has a grey track like an off switch; only the thumb position tells them apart.
  - **8-3 accepted.** Fast-forwarded into `feat/phase-8-polish`. **Phase 8 is ready for the owner's walk-through.**

## Notes for 1a-2 (prod)
- `TRUST_PROXY` reads the **first** `X-Forwarded-For` value. This is only safe if Caddy overwrites client-supplied XFF. Caddy ≥2.5 discards XFF from untrusted clients by default; keep `trusted_proxies` unset unless a CDN sits in front, and document this.
- `migrate` resolves `../../drizzle` relative to `dist/db/migrate.js`, so the prod api image must ship `apps/api/drizzle/` next to `dist/`.
- `migrate.ts` uses the full env schema, so the `migrate` service needs the same env file as `api`.
- **The prod build stage must set `NODE_ENV=production` explicitly** and must not load `.env.dev`/`.env.prod` at build time. Otherwise Vite bundles development React (+60 kB gz). Any `vite build` run inside the dev container produces a dev build and is not representative.

## Pending decisions
- Realtime phase (D-031): room model, presence, viewer/participant identity, interaction kinds, anti-spam (decide at its kickoff).
- Inactive guest cleanup policy (e.g. delete after N months of inactivity).
- Hosting target: VPS provider + domain (needed before Phase 9).
- Off-site backup destination (before Phase 9).

## Known issues / risks
- The mockup is mobile-only, so the desktop layout must be designed from scratch.
- The mockup's "Gachapon Wheel" is a slot machine. We use a horizontal case carousel instead (D-010).
- Guest data is lost if cookies are cleared, until account linking exists.
- Docker bind mounts + pnpm workspace `node_modules` can be fiddly (handled with container-owned volumes).

## Technical debt
- **API tests flake under host load:** each PGlite test file creates its own database in `beforeAll` under the default 10 s `hookTimeout`, which times out when the machine is busy (seen in 6-5b and the 7-1 review). Fix before Phase 9, either by raising `hookTimeout` for the api project or by sharing one PGlite per worker.
- `prod-deploy` skips the backup when the prod stack is stopped (e.g. after `make prod-down`) but `piko-prod_pgdata` holds data, so migrations would run without a backup. Fix before Phase 9: if the volume exists, start `db` (`up -d --wait db`) and back up before `up`.
- `prod-restore` does not take a safety backup of the current data before `--clean`. Add one before Phase 9.
- Restoring an old dump into a newer schema is not guarded. The runbook must say: restore only with the image version that created the dump.

## Before Phase 9 (VPS runbook, to be written in ENVIRONMENTS.md)
- Docker Engine ≥ 23 (BuildKit by default, unprivileged low ports inside containers), `make`, `git`.
- `chmod 600 .env.prod`. Firewall: TCP 80/443 and UDP 443 only; never expose 5432.
- HSTS uses `includeSubDomains`. Confirm that every subdomain of the chosen domain serves HTTPS, or drop that flag.
- Off-site copy of `backups/`.
