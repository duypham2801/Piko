# Implementation Plan

## Status
- **Current phase:** Phase 3 — Case opening (3-1 handoff ready)
- **Integration branch:** `feat/phase-3-case-opening` (pushed)
- **Completed:** Phase 0 — Discovery (decisions D-001…D-017); Phase 1a (1a-1, 1a-2); Phase 1b (1b-1, 1b-2); 1c-1 rebrand to PIKO; 1c-2 format gate; Phase 2 (2-1, 2-2); Phase 2.5 (spike, duration tuned to 8 s)

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
| 3-1 | Case-opening core | 🔧 handoff ready | `3-1-case-carousel.md`: state machine, carousel, `revealAtMs`, reduced motion, mounted in `App.tsx`, spike removed (D-027) |
| 3-2 | Reveal celebration | ⬜ | Winner pop + dim, in-house confetti, winner panel (D-027) |
| 4 | Home | ⬜ | Hero, mode selector (Solo + locked Soon), presets, recent decisions |
| 5 | Decision builder | ⬜ | CRUD decisions/options via API, validation, open case |
| 6 | Result + history | ⬜ | Winner reveal, Let's Go / Spin Again / Not Tonight / Share, history |
| 7 | Responsive pass | ⬜ | Desktop is not in the mockup and must be designed |
| 8 | Polish | ⬜ | States, micro-interactions, consistency |
| 9 | First prod release | ⬜ | Deploy `v0.1.0` to VPS, verify backup/rollback |
| — | Final engineering review | ⬜ | Format per master prompt §47–48 |

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

## Notes for 1a-2 (prod)
- `TRUST_PROXY` reads the **first** `X-Forwarded-For` value. This is only safe if Caddy overwrites client-supplied XFF. Caddy ≥2.5 discards XFF from untrusted clients by default; keep `trusted_proxies` unset unless a CDN sits in front, and document this.
- `migrate` resolves `../../drizzle` relative to `dist/db/migrate.js`, so the prod api image must ship `apps/api/drizzle/` next to `dist/`.
- `migrate.ts` uses the full env schema, so the `migrate` service needs the same env file as `api`.
- **The prod build stage must set `NODE_ENV=production` explicitly** and must not load `.env.dev`/`.env.prod` at build time. Otherwise Vite bundles development React (+60 kB gz). Any `vite build` run inside the dev container produces a dev build and is not representative.

## Pending decisions
- Emoji strategy: native vs SVG set (license check).
- Sound/haptics for case opening (Phase 3).
- Share format (Phase 6).
- Inactive guest cleanup policy (e.g. delete after N months of inactivity).
- Hosting target: VPS provider + domain (needed before Phase 9).
- Off-site backup destination (before Phase 9).

## Known issues / risks
- The mockup is mobile-only, so the desktop layout must be designed from scratch.
- The mockup's "Gachapon Wheel" is a slot machine. We use a horizontal case carousel instead (D-010).
- Guest data is lost if cookies are cleared, until account linking exists.
- Docker bind mounts + pnpm workspace `node_modules` can be fiddly (handled with container-owned volumes).

## Technical debt
- `prod-deploy` skips the backup when the prod stack is stopped (e.g. after `make prod-down`) but `piko-prod_pgdata` holds data, so migrations would run without a backup. Fix before Phase 9: if the volume exists, start `db` (`up -d --wait db`) and back up before `up`.
- `prod-restore` does not take a safety backup of the current data before `--clean`. Add one before Phase 9.
- Restoring an old dump into a newer schema is not guarded. The runbook must say: restore only with the image version that created the dump.

## Before Phase 9 (VPS runbook, to be written in ENVIRONMENTS.md)
- Docker Engine ≥ 23 (BuildKit by default, unprivileged low ports inside containers), `make`, `git`.
- `chmod 600 .env.prod`. Firewall: TCP 80/443 and UDP 443 only; never expose 5432.
- HSTS uses `includeSubDomains`. Confirm that every subdomain of the chosen domain serves HTTPS, or drop that flag.
- Off-site copy of `backups/`.
