# Implementation Plan

## Status
- **Current phase:** Phase 1 — Foundation (monorepo + Docker + design system)
- **Completed:** Phase 0 — Discovery (decisions D-001…D-017)

## Phases

| # | Phase | Status | Notes |
|---|---|---|---|
| 0 | Discovery | ✅ done | Greenfield; architecture in DECISIONS.md, ops in ENVIRONMENTS.md |
| 1a-1 | Monorepo + API skeleton + Docker dev | ✅ done | `1a-1-monorepo-dev-foundation.md` + `1a-1-fix-1.md` |
| 1a-2 | Docker prod (Caddy, migrate, hardening, backup/rollback) | ⏳ next | |
| 1b | Design system + `/design` | ⬜ | Tokens, fonts (VN subset, self-hosted), primitives, playground |
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

## Notes for 1a-2 (prod)
- `TRUST_PROXY` reads the **first** `X-Forwarded-For` value. This is only safe if Caddy overwrites client-supplied XFF. Caddy ≥2.5 discards XFF from untrusted clients by default; keep `trusted_proxies` unset unless a CDN sits in front, and document this.
- `migrate` resolves `../../drizzle` relative to `dist/db/migrate.js`, so the prod api image must ship `apps/api/drizzle/` next to `dist/`.
- `migrate.ts` uses the full env schema, so the `migrate` service needs the same env file as `api`.
- **The prod build stage must set `NODE_ENV=production` explicitly** and must not load `.env.dev`/`.env.prod` at build time. Otherwise Vite bundles development React (+60 kB gz). Any `vite build` run inside the dev container produces a dev build and is not representative.

## Pending decisions
- Exact fonts (proposed in Phase 1b).
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
- (none yet)
