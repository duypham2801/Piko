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
  - The cookie `piko_sid` (renamed from `wswd_sid` by D-023) holds an opaque 256-bit token: httpOnly, Secure (prod), SameSite=Lax, 1-year rolling expiry.
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
  - `compose.dev.yaml` (project `piko-dev`, renamed by D-023): bind-mounted source, Vite HMR, `tsx watch`, DB exposed on host port 5433.
  - `compose.prod.yaml` (project `piko-prod`):
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

## D-021 — Fonts: Baloo 2 (display) + Be Vietnam Pro (body), self-hosted via Fontsource
- **Choice:**
  - Display: `@fontsource-variable/baloo-2` (variable 400–800, used at 800).
  - Body: `@fontsource/be-vietnam-pro` (400/500/700).
  - Both are OFL-1.1 and both ship a `vietnamese` subset (verified with the Fontsource API on 2026-10-08).
- **Reason:**
  - Baloo 2 is rounded and chunky, the closest match to the mood board's "chunky pop" feel.
  - Be Vietnam Pro is designed for Vietnamese, so its diacritics are excellent.
  - Fontsource packages let Vite emit hashed `woff2` files into `/assets`. They are same-origin (CSP `font-src 'self'`), immutably cached by Caddy, and have pinned versions.
- **Rejected:**
  - Fredoka and Lilita One, the closest to the mockup look, have **no Vietnamese subset**.
  - Paytone One + Nunito: more "poster", only one display weight.
  - Bungee: uppercase-only, cramped stacked diacritics.
  - Committing raw `woff2` files: no dependency, but manual `@font-face` and manual updates.
- **Rule:** display line-height never below `--leading-tight` (1.15), so stacked Vietnamese marks (Ấ, Ổ, Ữ) don't clip.
- **Tradeoffs:**
  - Two runtime dependencies (CSS and font files only, no JS).
  - Unused subset files (e.g. devanagari) are emitted to `dist`, but browsers never download them thanks to `unicode-range`.
- **Phase:** 1b · 2026-10-08 · approved by user

## D-022 — `/design` is a dev-only page; no router until Phase 4
- **Rule:**
  - `main.tsx` lazy-loads `pages/design/DesignPage` only behind `import.meta.env.DEV` and `pathname === '/design'`, so the chunk is absent from prod builds.
  - Its developer-facing labels may be English literals (not i18n), because it is not shipped.
- **Reason:** the owner reviews the design system on `localhost:5173/design`. Users should never see it, and it should not cost bundle size.
- **Router:** no routing library yet. A single pathname check is enough for one dev page. Choose a router in Phase 4 (Home), when real navigation and deep links are needed.
- **Tradeoffs:** `/design` cannot be shown to someone without running the dev stack. If a shareable demo is needed later, revisit (e.g. a separate preview build).
- **Phase:** 1b · 2026-10-08 · approved by user

## D-023 — Brand: PIKO, "Pick. Open. Go."; full rename of internal identifiers
- **Choice:**
  - Product name **PIKO** (written uppercase as the wordmark). Tagline **"Pick. Open. Go."** It replaces the working title "What Should We Do?" and the tagline "Stop thinking. Just open."
  - The repository is `github.com/duypham2801/Piko`.
  - Brand name and tagline stay English in every locale, but still go through the i18n dictionary (`title`, `tagline`).
- **Full rename `wswd` → `piko`** (handoff 1c-1):
  - package scope `@wswd/*` → `@piko/*`, root package `piko`
  - compose projects `piko-dev` / `piko-prod`, so volumes become `piko-dev_*` / `piko-prod_*`
  - images `piko-api` / `piko-web`, BuildKit cache id `piko-pnpm`, backup files `backups/piko-prod-*.dump`
  - session cookie `piko_sid`
  - example DB user/name `piko`
- **Reason:** prod has never served real users, so this is the cheapest moment. Leaving `wswd` inside the code would make the internal names diverge from the brand forever.
- **Consequences:**
  - Dev starts on a fresh `piko-dev_pgdata` volume. The old dev data was only test guests.
  - Existing guest cookies (`wswd_sid`) are ignored, so every browser becomes a new guest once. Acceptable because there are no real users.
  - The old `wswd-*` volumes and images are orphaned and are removed manually by the owner after the rename is verified. The local `.env.dev` / `.env.prod` must be updated by hand (gitignored).
  - Past handoffs in `docs/handoffs/` keep the old names as historical records.
- **Not renamed:** the local checkout folder name, and the colors, fonts and visual direction (unchanged).
- **Phase:** 1c · 2026-10-08 · approved by user

## D-024 — Decision model for the MVP: label + emoji, weights, limits
- **Choice (owner, Phase 2 kickoff):**
  - `DecisionOption` = `id`, `label`, `emoji?`, `weight`, `enabled`. Image, location, price and notes are added later only when a feature needs them.
  - **Weights are in the MVP, including the UI.** A weight is an integer **1–5**. The default is 1. The chance of an option is `weight / sum(weights of enabled options)`.
  - Limits: **2–20 options** per decision, at least **2 enabled**. Label **1–40** characters after NFC normalization and trimming. Title **1–60**. Labels are unique, ignoring case.
  - `Decision` = `id`, `title`, `category?` (a slug, as data, never hard-coded), `options`. Persistence fields (`createdAt`, owner) are added with the API in Phase 5.
- **Guardrail (D-010):** the UI shows weights as levels (wording decided in Phase 5). It never shows percentages, odds or rarity colors. The case strip draws its filler items with the same weights, so what the user sees honestly matches the chances.
- **Alternatives:** uniform only (architect recommendation, rejected by the owner); weights in the engine but hidden in the UI.
- **Tradeoffs:** the builder needs a weight control, and the "not casino" line needs care in the Phase 5 copy.
- **Phase:** 2 · 2026-10-08 · approved by user

## D-025 — Selection engine: mulberry32, uint32 seed, versioned algorithm
- **Choice:**
  - PRNG: **mulberry32**, seeded with an unsigned 32-bit integer. It is tiny, fast, pure and well known. 2³² streams are plenty for picking among ≤ 20 options.
  - The caller generates the seed (`crypto.getRandomValues` in the web, later the server for group mode). The domain never reads a global random source.
  - The weighted pick uses integer arithmetic: `r = floor(rng() * totalWeight)`, then a walk over the enabled options **in input order**. It consumes exactly the first PRNG value.
  - `SelectionResult` = `{ algorithm: 'weighted-v1', seed, winnerId, candidateIds }`. The `algorithm` tag lets history and replay keep working if the algorithm changes later.
- **Reason:** D-005/D-017 need a reproducible result shared by web and api. Golden-value tests pin the exact output.
- **Alternatives:** sfc32/xoshiro128** with string seeds, which adds more state and hashing for no MVP benefit; `Math.random`, which is not reproducible.
- **Phase:** 2 · 2026-10-08 · default

## D-026 — The case stops at a seeded offset inside the winner cell
- **Choice (owner):** the stop position is offset randomly but deterministically (from the seed) within a safe central band of the winner cell, never near its edges. It is not always dead center.
- **Reason:** it feels natural and suspenseful, and it is still reproducible from the seed.
- **Details** (handoff 2-2):
  - The stop lands within ±0.3 of a cell from the winner centre (`stopBand` 0.6).
  - The plan uses its own PRNG stream, `seed ^ 0x9e3779b9`.
  - Filler cells are pure weighted draws (D-024 honesty). The only rule is that the two neighbours of the winner are never the winner.
  - One curve: a linear ramp over the first 6 % of the time, then a velocity decay `((1−t)/(1−a))^3`. Velocity is continuous and the stop is smooth.
  - All values live in `ANIMATION_PLAN_DEFAULTS`.
- **Tuned by the owner in the Phase 2.5 spike (2026-10-08):** only the duration changed, **6 s → 8 s**. The other defaults are kept:
  - 40–47 cells
  - `stopBand` 0.6
  - `accelFraction` 0.06
  - `decelPower` 3
  - 8 leading and 8 trailing cells
- With these values the peak speed is about 21 cells/s. Only about 0.2 cells move in the last 2 s, and about 0.01 in the last 1 s. The strip therefore *looks* stopped well before `durationMs`. Phase 3 must decide when the reveal starts, for example once the remaining distance falls below a small threshold, so the user does not wait on a frozen strip.
- **Revised in the 3-2 visual review (owner, 2026-10-08):** `stopBand` 0.6 → **0.9**.
  - The offset is uniform within ±0.45 cell, so the marker lands between 5 % and 95 % of the winner cell. With ±0.3 the stops always looked "near the middle".
  - It remains uniform and seeded. It is never biased towards the edges, because an engineered near-miss is forbidden (D-010).
  - The "never near its edges" wording above is superseded.
  - Handoff `3-2-fix-2.md`.
- **Phase:** 2 · 2026-10-08 · approved by user

## D-027 — Phase 3 case-opening experience choices
- **Reveal timing (owner):** the reveal starts when the strip is visually still, i.e. the remaining distance falls below `revealThresholdItems` (0.02 cell, about 2–3 px). It does not wait for the full `durationMs`.
  - The domain computes `revealAtMs` for each plan, about 6.9 s with the 8 s default.
  - The rAF loop keeps running until `durationMs`, so the strip lands exactly on `stopPosition` with no snap. The remaining motion is invisible.
- **Celebration (owner): moderate.**
  - The winner cell pops slightly with an outline, and the other cells dim.
  - One short confetti burst, implemented in-house with WAAPI/CSS (no library, D-006).
  - Then a winner panel with a large name.
  - Built in Phase 3-2. No flashes, shaking or rarity colors (D-010).
  - 3-2 adds four tokens for this: `--duration-celebrate` (1200 ms burst), `--scale-pop` (1.08), `--opacity-dimmed` (0.4) and `--z-raised` (1). Confetti is 20 deterministic CSS-keyframe pieces (transform/opacity only), hidden under reduced motion.
- **Sound and haptics (owner): deferred to Phase 8.** Sound needs licensed or synthesized assets, a mute control and autoplay handling.
- **Mount point (owner):** the case-opening screen with a fixed demo pool temporarily replaces the dev health/guest debug screen in `App.tsx`. This allows a full-screen review on phone and desktop. Home (Phase 4) and the builder (Phase 5) replace the demo pool with real data.
  - The app still warms the guest session in the background (`ensureSession()`, D-019), and never blocks on it (rule 5).
- **Reduced motion (default, rule 11):** no long spin. The strip starts a few cells before the winner and slides to `stopPosition` with a token-based CSS transition (`--duration-slow`, `--ease-out`). The reveal starts when that transition ends.
- **Phase:** 3 · 2026-10-08 · approved by user (reduced motion: default)

## D-028 — Phase 4 Home: router, presets, scope
- **Router (owner): React Router, declarative mode.**
  - Package `react-router`, pinned to `8.4.0`. The owner asked for "React Router v7"; v8 has been the current major since 2026-06 and keeps the same declarative API (`BrowserRouter`, `Routes`, `Route`, `Link`, `useParams`, `useSearchParams`). Its peer deps are React ≥ 19.2.7 and Node ≥ 22.22, which matches the repo.
  - Only declarative mode is used: no data router, loaders or framework mode.
  - Reason: Phase 4 introduces real screens, deep links and browser Back. A well-known router is preferred over a hand-rolled one.
  - The prod Caddy config already serves deep links (`try_files {path} /index.html`).
  - **Supersedes the "Router" line of D-022.** `/design` keeps its dev-only pathname check in `main.tsx`, outside the router.
- **Routes:**

  | Path | Screen | Since |
  |---|---|---|
  | `/` | Home | 4-1 |
  | `/presets/:slug` | Case opening | 4-1 |
  | `/presets/:slug` | Preset preview | 4-2 |
  | `/presets/:slug/open` | Case opening | 4-2 |
  | `*` | Not found | 4-1 |

  - Unknown preset slugs render the not-found screen.
- **Presets (owner):** four presets: "Ăn gì?", "Uống gì?", "Đi đâu chơi?", "Làm gì cuối tuần?".
  - They are static data in `apps/web/src/features/presets/`, shaped as domain `DecisionData`, with category as data (`food`, `drinks`, `outing`, `weekend`). All weights are 1.
  - Option labels are locale-specific **content**, not UI strings, so they live in the preset data rather than in `i18n/vi.ts`. An English locale would ship its own preset set.
  - In dev, the presets are validated against the domain `Decision` schema at module load.
- **Preset flow (owner):** tapping a preset card opens a **preview** first. The user can switch individual options off (at least 2 must stay on), then open the case.
  - The set of switched-off options is kept in the URL (`?off=` with option indexes). Back, reload and links all keep it.
  - Built in 4-2. In 4-1 the card opens the case directly.
- **Scope (owner):** Phase 4 = hero + mode selector + preset cards + preview.
  - "Recent decisions" moves to Phase 6, where history exists.
  - "Create decision" moves to Phase 5, where the builder exists.
  - No placeholder or locked UI is shown for either.
- **Mode selector (default):** a native radio group (`fieldset`/`legend` with `input type="radio"`), not toggle chips. This follows the 1b-2 review note.
  - Solo is checked.
  - Couple/Squad are disabled radios with a "Sắp có" badge (D-004). There is no mode state, because only Solo exists.
- **Copy:** `spinAgain` changes from "Quay lại" to "Mở lại". "Quay lại" also means "go back", which would be ambiguous next to the new back link.
- **Phase:** 4 · 2026-10-08 · approved by user (router, preset flow, scope, preset list); default (mode selector, URL `off`, copy)

## D-029 — Phase 5 decision builder: storage, save flow, UI choices
- **Save flow (owner): an explicit "Lưu" button.**
  - The builder saves the whole decision with one request (POST to create, PUT to update), then goes to the decision page, where the user opens the case.
  - If saving fails, the builder shows a non-blocking error and still lets the user open the case with the current draft (rule 5: a network failure never blocks a decision).
  - No autosave. Last write wins; there is no optimistic-concurrency check in the MVP (one user, one device at a time).
- **Weights UI (owner): five tappable dots per option**, under one label "Độ ưu tiên".
  - A filled dot means the level is reached; tapping dot N sets weight N. The default is 1.
  - It is a radio group per option, so it stays keyboard and screen-reader friendly.
  - Never show percentages, odds or rarity colors (D-010). This settles the wording left open in D-024.
- **Saved decisions on Home (owner):** a "Của bạn" section above "Chọn nhanh", with a "Tạo quyết định" button and one card per saved decision, most recently updated first.
  - When there are no saved decisions, only the button shows.
  - No separate list page.
- **Emoji (owner): native emoji from a curated picker.**
  - The builder offers a small built-in set (about 40 emoji: food, drinks, places, activities) plus "no emoji". No dependency, no SVG set.
  - This settles the pending "emoji strategy" decision: native emoji.
- **Customize a preset (owner):** the preset preview gets a secondary "Tùy chỉnh" button. It opens the builder pre-filled with the preset's title and options (new ids), to be saved as the user's own decision.
- **Storage (default):**
  - One new table `decisions`: `id`, `user_id` (FK → `users`, cascade delete), `title`, `category` (nullable), `options` (**JSONB**, the validated option array in order), `created_at`, `updated_at`; index on `(user_id, updated_at)`.
  - Options are a JSONB column, not a separate table: they are always read and written together with their decision, there are at most 20, and a PUT replaces them atomically. History (Phase 6) will store a snapshot of the labels, so it does not need a foreign key to each option.
  - The server generates the decision id. The client generates option ids (UUID), and the server keeps them, so option ids stay stable across edits.
  - At most **100 decisions per user** (`DECISION_LIMITS.maxDecisionsPerUser`), checked in a transaction that locks the user row.
- **API (default):**

  | Method | Path | Result |
  |---|---|---|
  | `GET` | `/api/decisions` | the user's decisions, most recently updated first |
  | `GET` | `/api/decisions/:id` | one decision |
  | `POST` | `/api/decisions` | create → 201 |
  | `PUT` | `/api/decisions/:id` | replace title/category/options → 200 |
  | `DELETE` | `/api/decisions/:id` | delete → 204 |

  - These routes **require an existing session** (401 `session_required`). Unlike `/api/me`, they never create a guest; the web always awaits `ensureSession()` first (rule 12).
  - A decision that does not exist, belongs to another user, or has a malformed id is a 404. The API does not reveal whether another user's decision exists.
  - Request bodies are limited to 16 KB.
- **Category (default):** stays in the model but has no UI in Phase 5, because nothing uses it yet.
- **Test database (owner): PGlite.** `@electric-sql/pglite` `0.5.8` (Apache-2.0) is an `apps/api` **devDependency**.
  - It runs real PostgreSQL in WASM inside the test process. The API service and ownership tests run against the real Drizzle migrations, without a database container, so `make check` stays container-free.
  - It is never part of the prod image (`pnpm deploy --prod`).
- **Web routes (default, built in 5-2/5-3):** `/decisions/new` (optionally `?from=<preset slug>`), `/decisions/:id` (preview with switches, like presets), `/decisions/:id/edit`, `/decisions/:id/open`.
- **Phase:** 5 · 2026-10-08 · approved by user (save flow, weights UI, Home list, emoji, preset customize, PGlite); default (storage, API, category, routes)
