# CLAUDE.md — PIKO

A playful decision-making web app: the user gives a pool of options, opens a "case", and a horizontal case-opening carousel reveals the winner. Brand: **PIKO**. Tagline: **"Pick. Open. Go."** (D-023)

- Full product brief: `docs/prompts/PIKO_MASTER_PROMPT.md`. It is the source of truth for vision, phases and the review format.
- Visual mood board: `images/figma_unisex_screens_design.png`. It is AI-generated, so use it for style only. Its hex values, font names and some screens (slot machine, group room) are **not** spec. The spec lives in `docs/DECISIONS.md` and `apps/web/src/styles/tokens.css`.
- Environments and operations: `docs/ENVIRONMENTS.md`.
- Current vs target topology: `docs/TOPOLOGY.md` (for the owner, in Vietnamese).

## Roles (IMPORTANT)

This project uses two separate agents. Know which one you are.

### Solution Architect: the session working directly with the project owner
- Discusses ideas, product, UX, tech stack and architecture with the owner, in Vietnamese. Raises risks and recommends options. Uses the "DECISION NEEDED" format and HITL questions for material decisions.
- **Does NOT write application code.** It owns only `CLAUDE.md`, `docs/**` and handoff prompts.
- Splits work into small, reviewable tasks. For each task it writes a **self-contained handoff prompt** in `docs/handoffs/<id>-<slug>.md`, and the owner tells the implementer to read that file directly. The file contains **only** the content addressed to the implementer: no notes to the owner, no "copy below this line" markers. It follows `docs/handoffs/_TEMPLATE.md`.
- A handoff prompt must not assume the implementer knows anything beyond the repo files. It states:
  - context
  - scope / out of scope
  - files to create or touch
  - exact requirements and constraints
  - acceptance criteria
  - validation commands
  - the report format to return
- When the owner reports the task is done, the architect **reviews** the actual code and diff. It runs read-only checks (typecheck/build/lint/test, image sizes), compares against the handoff's acceptance criteria and CLAUDE.md, then:
  - classifies findings as MUST FIX / SHOULD FIX / NICE TO HAVE / DO NOT TOUCH
  - writes a follow-up fix prompt if needed
  - updates `docs/IMPLEMENTATION_PLAN.md` and `docs/DECISIONS.md`
- **Topology upkeep:** when a review, decision or handoff changes the topology, the architect must first ask the owner with a HITL question whether to update `docs/TOPOLOGY.md`. Topology changes include:
  - services, ports, networks or volumes
  - routes or DB tables
  - environments or hosting

  On approval, it updates the file and adds a line to its change log.
- The architect does not silently fix code during review. Any change goes through a fix prompt, unless the owner explicitly asks the architect to edit directly.

### Implementer: the coding agent receiving a handoff prompt
- Implements **only** the scope of the handoff. It does not change architecture, add dependencies or alter decisions outside the handoff.
- If something in the handoff conflicts with this file or is impossible, it stops and reports. It does not improvise.
- It finishes with the report format requested in the handoff (files changed, validation output, deviations, open questions).

## Stack

- **Monorepo** with pnpm workspaces, Node 22, TypeScript strict everywhere.
  - `apps/web`: Vite + React SPA. CSS Modules + CSS custom properties (design tokens). No UI framework, no Tailwind.
  - `apps/api`: Hono on Node, Drizzle ORM, zod validation.
  - `packages/domain`: pure TS shared by web and api. It holds the decision model, seeded selection engine, animation-plan math and zod schemas.
- **PostgreSQL 17** stores user data.
- **Identity**: anonymous guest accounts via an opaque session token in an httpOnly cookie. They can be upgraded to real accounts later without data loss.
- **Docker** for every environment. Dev and prod are separate compose projects. Caddy is the prod edge (TLS, static files, `/api` reverse proxy, security headers).
- Animation uses the Web Animations API or a time-based `requestAnimationFrame` loop. No animation library unless a decision is recorded.

## Commands

Everything is run from the repo root.

```bash
make dev            # start dev stack (web HMR + api watch + db) — project "piko-dev"
make dev-down       # stop dev stack (data kept)
make dev-logs       # follow dev logs
make db-migrate     # generate/apply migrations in dev
make check          # typecheck + lint + test (domain/api logic) inside the dev container

make prod-build     # build immutable prod images tagged with APP_VERSION
make prod-deploy    # backup DB → run migrations → start/replace prod stack — project "piko-prod"
make prod-rollback  # switch back to the previous image tag
make prod-backup    # pg_dump prod DB into ./backups
```

Run `check` after meaningful changes and before closing a phase, not after every CSS tweak.

## Architecture rules (non-negotiable)

1. **The winner is decided before the animation starts.** The flow is `select()` → `SelectionResult` → `buildAnimationPlan()` → carousel. The UI never picks the winner.
2. **One authoritative selection engine** lives in `packages/domain/src/selection/`. It is seedable, so the same seed and options always give the same result and the same strip layout.
3. **`packages/domain` is framework-free.** It does not import React, the DOM, Hono, Drizzle or Node APIs.
4. **Dependency direction**: `web → domain` and `api → domain`. `web` never imports from `api`; the two only talk over HTTP using the shared zod schemas from `domain`.
5. **A network failure must never block a decision.** Solo selection runs client-side with the shared engine. Saving history to the API is best-effort and shows a non-blocking error on failure.
6. **Trust boundary**: the API validates every input with zod and only acts on resources owned by the session's user. Never trust client-sent `userId`.
7. **Separate interaction state from visual phases.** The state machine covers `idle → ready → spinning → revealed`. Fast/decelerate/final-approach are *derived* from one continuous easing timeline.
8. **Do not hard-code the domain to restaurants.** Use `Decision`, `DecisionOption`, `DecisionSession`, `DecisionTemplate` (presets) and `DecisionFeedback`, with category as data.
9. **MVP is Solo only.** Couple/Squad are shown in the UI as locked "Soon" and must not be implemented without approval.
10. **Animate only transform/opacity.** Carousel math uses item units so a resize mid-spin does not break the stop.
11. **Reduced motion**: skip the long spin, do a short transition and reveal clearly.
12. **Session bootstrap is single-flight.** The web calls `ensureSession()` (`apps/web/src/lib/api/session.ts`), which shares one memoized `/api/me` request. Every identity-bound request awaits it first. Parallel cookie-less requests would otherwise create duplicate guest users.

## Environment & Docker rules

- Dev and prod are **fully isolated**. They use different compose project names (`piko-dev` / `piko-prod`), so their containers, networks and **database volumes** are separate. Dev must never connect to the prod DB.
- Each environment has its own env file: `.env.dev` and `.env.prod`, both gitignored. `.env.example` is committed. Never commit secrets and never bake them into images.
- Prod runs **immutable, versioned images** built from a git tag (`APP_VERSION`). There are no bind mounts or dev tools in prod.
- Prod containers:
  - run as a non-root user with read-only root FS, `no-new-privileges` and `cap_drop: ALL`
  - have healthchecks, `restart: unless-stopped`, memory limits and log rotation
- Only Caddy publishes ports in prod (80/443). The DB sits on an internal network only.
- **Migrations must be backward compatible** (expand → deploy → contract), so the previous image still works after a migration and rollback is safe. Every prod deploy takes a DB backup first.
- Keep images small: multi-stage builds, `node:22-alpine`, `pnpm fetch` layer caching, `pnpm deploy --prod` for the api, and the web image is just Caddy + static `dist`.

## Suggested structure

```
apps/
  web/src/
    app/            # routing, providers, layout shell
    features/       # home, builder, case-opening, result, history
    components/ui/  # design-system primitives
    styles/         # tokens.css, global.css, fonts
    i18n/           # vi dictionary (default), structure ready for en
    lib/api/        # typed API client (uses domain schemas)
    pages/design/   # /design playground
  api/src/
    routes/         # hono routers (thin)
    services/       # use-cases
    db/             # drizzle schema, migrations, migrate.ts
    auth/           # guest session middleware
packages/
  domain/src/       # model, selection, animation-plan, schemas
docker/             # Dockerfile(s), Caddyfile
compose.dev.yaml
compose.prod.yaml
Makefile
```

Extract components only at a real reuse boundary. Do not build generic frameworks ahead of need.

## Design system

- Tokens live in `apps/web/src/styles/tokens.css`. **Never write raw color, duration or shadow literals in components.**
- Palette: coral `#FF5722`, teal `#14B8A6`, lemon `#FBBF24`, cream `#FFFBEB`, navy `#0F172A`, plus semantic tokens.
- Contrast: white text is **not allowed** on teal or lemon. Use navy text or the dark teal token. White text on coral is only allowed for large/bold text.
- Typography: one chunky display font and one clean body font: **Baloo 2 + Be Vietnam Pro** (D-021). **Both must include the Vietnamese subset.** Self-host the fonts via Fontsource (no third-party font CDN in prod).
- Motion tokens: fast / normal / slow / spring / easings. No ad-hoc durations.
- Playful, not childish. Game-like, not casino-like: no rarity tiers, no slot-machine visuals, no fake odds. Do not copy CS/CS2 assets.
- `/design` playground (dev-only, D-022): verify every shared component change there.

## Language

- UI copy is **Vietnamese by default**. The brand name "PIKO" and the tagline "Pick. Open. Go." stay English (they still live in the i18n dictionary). All strings go through `apps/web/src/i18n/`.
- Code, identifiers, comments and commit messages are in English. Chat with the user in Vietnamese.

## Testing policy

- Test only deterministic logic:
  - selection engine
  - animation-plan math
  - state machine (if non-trivial)
  - API services and authorization rules (ownership checks)
- **No** render, snapshot, E2E smoke or screenshot tests, and no curl loops.
- The case-opening feel is validated in the browser by the user.

## Workflow

- Loop:
  1. Architect discusses with the owner and writes the handoff prompt.
  2. The owner tells the implementer to read the handoff file.
  3. The implementer codes and reports.
  4. The owner tells the architect, who reviews and updates the docs.
  5. At UI milestones, the owner does a browser review ("PHASE READY FOR VISUAL REVIEW").
  6. If needed, the architect writes a fix prompt, and the loop repeats.
- Keep tasks small enough to review in one sitting. Each one should be a coherent slice, not a whole phase if the phase is large.
- For decisions that materially affect architecture, data model, dependencies, UX or visual direction, use the "DECISION NEEDED" format and wait.
- Every new dependency needs a concrete reason recorded in `docs/DECISIONS.md`.
- Git:
  - `main` is always releasable.
  - Work happens on `feat/*` / `fix/*` branches.
  - Each feature/phase has an integration branch (e.g. `feat/phase-2-core-domain`), which is pushed to GitHub. Task branches start from it and are merged back into it after review. It is merged into `main` only when the whole feature is done and reviewed.
  - Releases are tagged `vX.Y.Z` and only tags get deployed to prod.
- Keep `docs/IMPLEMENTATION_PLAN.md` and `docs/DECISIONS.md` in sync with the code.
- Never claim visual correctness because the code compiles.
