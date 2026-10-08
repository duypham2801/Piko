# Implementation Plan

## Status
- **Current phase:** Phase 2 — Core decision domain (next)
- **Completed:** Phase 0 — Discovery (decisions D-001…D-017); Phase 1a (1a-1, 1a-2); Phase 1b (1b-1, 1b-2); 1c-1 rebrand to PIKO

## Phases

| # | Phase | Status | Notes |
|---|---|---|---|
| 0 | Discovery | ✅ done | Greenfield; architecture in DECISIONS.md, ops in ENVIRONMENTS.md |
| 1a-1 | Monorepo + API skeleton + Docker dev | ✅ done | `1a-1-monorepo-dev-foundation.md` + `1a-1-fix-1.md` |
| 1a-2 | Docker prod (Caddy, migrate, hardening, backup/rollback) | ✅ done | `1a-2-docker-prod.md` + `1a-2-fix-1.md` (merged `1d98559`) |
| 1b-1 | Tokens + fonts + dev-only `/design` | ✅ done | `1b-1-tokens-fonts-design-page.md` (merged `3513f2c`) |
| 1b-2 | UI primitives in `/design` | ✅ done | `1b-2-ui-primitives.md` (`5ec3629`) + `1b-2-fix-1.md` (`9503c43`) |
| 1c-1 | Rebrand to PIKO: full `wswd` → `piko` rename | ✅ done | `1c-1-rebrand-piko.md` (D-023, `d44cca4`) |
| 2 | Core decision domain | ⬜ | `packages/domain`: types, seeded PRNG, selection, validation, animation plan, zod schemas + tests |
| 2.5 | Case-opening spike | ⬜ | Rough carousel in `/design` to validate motion feel early |
| 3 | Case opening (full) | ⬜ | Controller, state machine, timeline, marker, reveal, reduced-motion |
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
