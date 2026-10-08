# Architecture & Product Decisions

Format: Decision · Reason · Alternatives · Tradeoffs · Phase/Date

---

## D-001 — Stack: Vite + React + TypeScript (frontend)
- **Status:** amended by D-011 (no longer client-only; this now describes `apps/web`).
- **Reason:** Greenfield. Fast dev loop, small footprint.
- **Alternatives:** Next.js (SSR, OG images, API routes); SvelteKit.
- **Tradeoffs:** Share links get no server-rendered preview images. If OG images become important, revisit (a small edge function would be enough).
- **Phase:** 0 · 2026-10-07 · approved by user

## D-002 — Styling: CSS Modules + CSS custom properties
- **Reason:** Zero extra dependencies, full control over the chunky/outlined visual, tokens enforced through variables.
- **Alternatives:** Tailwind v4.
- **Tradeoffs:** Layout scaffolding is more verbose. This needs discipline to avoid raw literals (enforced by review).
- **Phase:** 0 · 2026-10-07 · approved by user

## D-003 — UI language: Vietnamese default + lightweight i18n
- **Reason:** Matches the local tone of the mockup ("Xoay Kèo", "Bún Chả Hà Nội"). A dictionary structure lets us add English later cheaply.
- **Alternatives:** Bilingual from day one; English only.
- **Tradeoffs:** All strings must go through the dictionary from the start. Fonts must support Vietnamese diacritics.
- **Phase:** 0 · 2026-10-07 · approved by user

## D-004 — Couple/Squad modes shown as locked "Soon"
- **Reason:** Keeps the mockup's visual identity and signals the roadmap without scope creep.
- **Alternatives:** Hide entirely; local couple mode.
- **Tradeoffs:** Locked controls add a little visual noise. They must clearly read as unavailable (aria-disabled + label).
- **Phase:** 0 · 2026-10-07 · approved by user

## D-005 — Winner selected before animation; seeded and deterministic
- **Reason:** Core requirement of the master prompt. It enables weighted/smart engines, history, replay and group sync later.
- **Design:** `select(options, { seed })` → `SelectionResult { winnerId, seed, ... }` → `buildAnimationPlan(result, options)` → strip layout + stop offset.
- **Phase:** 0 · default (no approval needed, mandated by brief)

## D-006 — Animation: single continuous timeline, no animation library
- **Reason:** Chained per-phase transitions cause velocity discontinuities. One custom easing curve with derived visual phases is smoother and simpler. WAAPI/rAF covers the need.
- **Alternatives:** Framer Motion, GSAP.
- **Tradeoffs:** The easing curve has to be written by hand. Revisit if spring physics become hard to manage.
- **Phase:** 0 · default

## D-007 — ~~Persistence: localStorage behind a repository interface~~
- **Status:** superseded by D-012/D-013 (server-side per-user storage). `localStorage` is only used for UI preferences (e.g. mute, last mode).
- **Phase:** 0 · 2026-10-07

## D-008 — Palette normalized from the mockup
- coral `#FF5722`, teal `#14B8A6`, lemon `#FBBF24`, cream `#FFFBEB`, navy `#0F172A`.
- **Reason:** The mockup's hex values were inconsistent or invalid (`#1488X6`, `#F9BF24` vs `#F0BF24`).
- **Contrast rule:** white text on teal is 2.5:1 and fails, so use navy or a dark teal token. White text on coral (3.2:1) is allowed only for large/bold text.
- **Phase:** 0 · default (tweakable during Phase 1 browser review)

## D-009 — Result actions semantics
- **Spin Again:** same pool, new seed.
- **Not Tonight / Reject:** temporarily exclude the winner from this session, then respin.
- **Let's Go / Accept:** record the session as accepted in history.
- **Phase:** 0 · default (revisit in Phase 6)

## D-010 — Not-casino guardrails
- No rarity tiers or rarity colors, no slot-machine visuals or levers, no currency/rewards, no engineered "almost won" messaging.
- **Phase:** 0 · default

---

## D-011 — Monorepo: web + api + shared domain (pnpm workspaces)
- **Reason:** User data must be stored server-side. Sharing `packages/domain` (model, selection engine, zod schemas) avoids duplicated business logic and keeps one authoritative selection engine.
- **Alternatives:** Separate repos; Next.js full-stack.
- **Tradeoffs:** Slightly more tooling (workspace config). It keeps the SPA and API independently deployable.
- **Phase:** 0 · 2026-10-07 · approved by user (implied by Docker + per-user storage request)

## D-012 — Database: PostgreSQL 17
- **Reason:** Standard, handles concurrency, ready for group/realtime later. Runs as its own container with a named volume.
- **Alternatives:** SQLite in a volume.
- **Tradeoffs:** ~30–50MB extra RAM and one more container.
- **Phase:** 0 · 2026-10-07 · approved by user

## D-013 — Identity: anonymous guest sessions, upgradable later
- **Design:**
  - On first API call without a session, create `users(kind='guest')` plus a session.
  - The cookie `wswd_sid` holds an opaque 256-bit token: httpOnly, Secure (prod), SameSite=Lax, 1-year rolling expiry.
  - The DB stores only `sha256(token)`.
  - Later, account linking attaches email/OAuth identities to the same user row.
- **Security:**
  - Mutations require a JSON content type plus an Origin check (CSRF defense together with SameSite).
  - Guest creation is rate-limited per IP.
  - Every query is scoped to the session's `userId`.
- **Alternatives:** Real accounts now; browser-only storage.
- **Tradeoffs:** Data is tied to the cookie until linking exists. Inactive guests need a cleanup policy (pending decision).
- **Phase:** 0 · 2026-10-07 · approved by user

## D-014 — API: Hono + Drizzle + zod
- **Reason:** Lightweight, TS-first, small image. Drizzle is SQL-close with first-class migrations. zod schemas are shared with the web via `packages/domain`.
- **Alternatives:** Fastify; NestJS + Prisma.
- **Tradeoffs:** Hono's plugin ecosystem is smaller than Fastify's. Rate limiting, cookies and security headers are covered by Hono middleware and Caddy.
- **Prod migrations:** run with drizzle-orm's migrator (`dist/db/migrate.js`), so `drizzle-kit` is not shipped in the prod image.
- **Phase:** 0 · 2026-10-07 · approved by user

## D-015 — Docker environments: isolated dev and prod compose projects
- **Design:**
  - `compose.dev.yaml` (project `wswd-dev`): bind-mounted source, Vite HMR, `tsx watch`, DB exposed on host port 5433.
  - `compose.prod.yaml` (project `wswd-prod`):
    - immutable images tagged `APP_VERSION`
    - Caddy is the only public entry (TLS, static files, `/api` proxy, security headers/CSP)
    - one-off `migrate` service gates `api` startup
    - DB on an internal network only
- **Hardening (prod):**
  - non-root, read-only rootfs + tmpfs, `cap_drop: ALL`, `no-new-privileges`
  - healthchecks, `restart: unless-stopped`
  - memory limits, json-file log rotation
- **Images:** multi-stage builds on `node:22-alpine`, `pnpm fetch` for layer caching, `pnpm deploy --prod` for the api. The web image is `caddy:2-alpine` + `dist`.
- **Operations:** `Makefile` targets (dev, check, prod-build, prod-deploy with automatic pre-migration backup, prod-rollback, prod-backup).
- **Amendment (1a-2 review, 2026-10-08):**
  - Prod Caddy runs non-root with the file capability removed (`setcap -r`), because `cap_drop: ALL` + `no-new-privileges` would otherwise block it from starting.
  - Accepted image sizes are about 190 MB (api) and 120 MB (web). Each service gets only the env vars it needs; caddy never sees DB credentials.
  - A failed backup aborts the deploy.
- **Reason:** The user needs to keep developing while prod stays live and unaffected. Separate project names give separate containers, networks and DB volumes, so dev can never touch prod data.
- **Alternatives:** Base + override compose files (less duplication, but easier to mix environments by mistake); API serving static files (2 containers, needs an external TLS proxy).
- **Tradeoffs:** The `db` service definition is duplicated across the two files (small, explicit). This setup assumes a single VPS with a domain. A staging environment can be added later as a third project with the same pattern.
- **Phase:** 0 · 2026-10-07 · default chosen for user (user requested isolated dev/prod, no prior preference)

## D-016 — Release & migration discipline
- `main` is always releasable. Feature branches are merged after review, releases are git tags `vX.Y.Z`, and only tags are deployed.
- Migrations follow expand → deploy → contract, so the previous image stays compatible and rollback is safe.
- **Phase:** 0 · 2026-10-07 · default

## D-017 — Solo selection runs client-side; history saved best-effort
- **Reason:** A decision must never be blocked by the network. The shared engine runs in the browser with a seed. The session (seed, options snapshot, winner) is POSTed to the API for history.
- **Future:** group mode makes the server authoritative for seed and result, so all participants replay the same animation.
- **Phase:** 0 · 2026-10-07 · default

## D-018 — TypeScript pinned to 6.x
- **Reason:** `typescript-eslint@8` does not support TypeScript 7 yet, and with TS 7 ESLint fails to run (found during 1a-1).
- **Revisit:** when typescript-eslint supports TS 7.
- **Phase:** 1a-1 review · 2026-10-07 · default

## D-019 — Client session bootstrap is single-flight
- **Reason:** In the 1a-1 review, each first visit created 2 guest users (StrictMode double effect plus parallel cookie-less requests).
- **Rule:** the web uses `ensureSession()`, a memoized `/api/me` call. Identity-bound requests await it first.
- **Alternatives:** a server-side dedupe (not reliably possible without client state); creating the session in Caddy/edge (overkill).
- **Tradeoffs:** a slight serialization on first load only. Orphan guests from other races (e.g. multiple tabs opened simultaneously on first visit) remain possible and are covered by the pending guest-cleanup policy.
- **Phase:** 1a-1 review · 2026-10-07 · default

## D-020 — `packages/domain` schemas use `zod/mini`
- **Measured (1a-1-fix-1):** for equivalent schemas, zod classic costs 22.5 kB gz and zod/mini costs 4.9 kB gz. The real prod web bundle is 90.7 kB gz, so this saves about 19%. Classic is not tree-shakable, so its cost is fixed. Mini scales with usage, and the domain will grow (decision, options, sessions).
- **Rule:**
  - Shared schemas in `packages/domain` import `* as z from 'zod/mini'`, using the functional API (`z.optional(...)`, `.check(z.minLength(...))`).
  - The api uses the same schemas. API-only schemas (e.g. `env.ts`) may keep zod classic.
  - Do not mix classic and mini on the same schema.
- **When:** convert the 3 existing schemas at the start of Phase 2 (domain). They are trivial today.
- **Tradeoffs:** a slightly more verbose API. Default error messages are generic, which is fine because user-facing messages come from i18n.
- **Phase:** 1a-1 review · 2026-10-07 · default (architect recommendation; owner may override)
