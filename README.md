# PIKO

**Pick. Open. Go.**

PIKO is a playful decision-making web app. You list your options, give the ones you like more a higher weight, and open a "case". A horizontal case-opening carousel spins and reveals the winner.

> **Status:** early development. Phase 1 (foundation, design system, PIKO rebrand) is complete. Phase 2 (core decision domain) is in progress. See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## How it works

The winner is decided **before** the animation starts. A seeded, deterministic engine in `packages/domain` picks it, and the carousel only shows that result. The same seed and options always give the same winner and the same strip, which makes history and replay possible. Solo decisions run in the browser, so a network failure never blocks a decision.

The UI is in Vietnamese by default.

## Stack

| Part | Tech |
|---|---|
| `apps/web` | Vite + React + TypeScript, CSS Modules with design tokens |
| `apps/api` | Hono on Node 22, Drizzle ORM, zod |
| `packages/domain` | Framework-free TypeScript: decision model, seeded selection engine, shared schemas |
| Data | PostgreSQL 17, anonymous guest sessions via an httpOnly cookie |
| Infra | Docker Compose for isolated dev and prod environments. Caddy serves prod and adds TLS and security headers. |

## Getting started

Requirements: Docker (with Compose) and `make`.

```bash
cp .env.example .env.dev   # local dev settings (gitignored)
make dev                   # start db + api + web with hot reload
```

- App: http://localhost:5173
- Design playground (dev only): http://localhost:5173/design

Other useful commands:

```bash
make check       # typecheck + lint + format check + tests (in the dev container)
make dev-logs    # follow logs
make dev-down    # stop (data is kept)
make help        # list all targets
```

Production uses immutable images built from a git tag (`make prod-build`, `make prod-deploy`, `make prod-rollback`). See [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md).

## Docs

- [`CLAUDE.md`](CLAUDE.md): architecture rules, conventions and workflow
- [`docs/DECISIONS.md`](docs/DECISIONS.md): decision log
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md): phases and review log
- [`docs/ENVIRONMENTS.md`](docs/ENVIRONMENTS.md) and [`docs/TOPOLOGY.md`](docs/TOPOLOGY.md): environments and topology (Vietnamese)

## License

No license has been chosen yet, so all rights are reserved by default.
