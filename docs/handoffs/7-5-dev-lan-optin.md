# HANDOFF 7-5 — Dev LAN access as an opt-in

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

The owner wants to open the dev web app from a phone on the same Wi-Fi. A first version already exists as **uncommitted changes** in the working tree of `feat/phase-7-responsive`:

- `apps/api/src/env.ts`: optional `DEV_LAN_ORIGIN` (URL), rejected unless `NODE_ENV=development`.
- `apps/api/src/app.ts`, `apps/api/src/index.ts`: `AppConfig.additionalAppOrigin`; the mutation guard and Hono `csrf()` accept `APP_ORIGIN` plus that origin.
- `apps/api/src/routes/decisions.test.ts`: a test that the LAN origin may write and another origin gets `403 csrf_failed`.
- `compose.dev.yaml`: the web port changed from `127.0.0.1:5173:5173` to `0.0.0.0:5173:5173`.
- `.env.example`, `README.md`: notes about `DEV_LAN_ORIGIN`.
- `docs/ENVIRONMENTS.md`, `docs/TOPOLOGY.md`: already updated by the architect for this handoff. **Do not edit them.**

The architect's review kept the API part and found two problems with the port binding (decision **D-034** in `docs/DECISIONS.md`):

1. **Docker bypasses ufw.** Docker writes its own iptables rules for published ports. `0.0.0.0:5173` is therefore reachable on every host interface (LAN, Tailscale, any other network), whatever the host firewall says.
2. **It changes the default for everyone.** Every `make dev` now exposes the Vite dev server, which can serve files from the workspace, even when nobody asked for LAN access.

D-034 makes LAN exposure an explicit opt-in:
- The web port is always published on `127.0.0.1:5173`, so `localhost` keeps working on the host.
- When `DEV_WEB_BIND` is set in `.env.dev`, a small override file adds a second binding on that one host IP.

## Scope

- Keep the existing uncommitted API changes as they are (they were reviewed and accepted).
- Restore the default web binding to `127.0.0.1:5173`.
- Add an override file that publishes the web port on `DEV_WEB_BIND`.
- Load that override only when `DEV_WEB_BIND` is set in `.env.dev`.
- Make Compose read `.env.dev` for variable interpolation.
- Print the LAN URL from `make dev` when LAN access is configured.
- Add unit tests for the `DEV_LAN_ORIGIN` env rule.
- Update `.env.example` and `README.md` to match.

## Out of scope (do NOT do)

- Do not change the API or DB port bindings (`127.0.0.1:8787`, `127.0.0.1:5433`).
- Do not change `compose.prod.yaml`, the Caddyfile, or anything prod.
- Do not change `vite.config.ts` (no `allowedHosts`, no HMR settings).
- Do not derive one variable from the other or validate them against each other. They stay two independent settings (see Requirements 5).
- Do not edit anything under `docs/`.

## Files to create / modify

- `compose.dev.yaml`: restore the web port mapping.
- `compose.dev.lan.yaml` (new): the LAN port binding.
- `Makefile`: `COMPOSE_DEV` and the `dev` target's output.
- `.env.example`: document `DEV_WEB_BIND` next to `DEV_LAN_ORIGIN`.
- `README.md`: the LAN paragraph.
- `apps/api/src/env.test.ts` (new): env rule tests.

## Requirements

### Git

1. Before any edit, run `git switch -c fix/dev-lan-access` from `feat/phase-7-responsive`. The uncommitted changes carry over to the new branch.
2. Commit only code, config and `README.md`. **Leave the `docs/` changes uncommitted.** The architect commits them during review.

### 1. Port binding

**`compose.dev.yaml`:** restore the web port to exactly:

```yaml
ports:
  - '127.0.0.1:5173:5173'
```

Do not touch the `db` or `api` port lines.

**`compose.dev.lan.yaml` (new):** an override that only adds a second binding for the web service:

```yaml
# Loaded by the Makefile only when DEV_WEB_BIND is set in .env.dev (D-034).
services:
  web:
    ports:
      - '${DEV_WEB_BIND:?DEV_WEB_BIND must be set}:5173:5173'
```

- Compose appends `ports` from an override file, so the web service ends up with both `127.0.0.1:5173` and `<DEV_WEB_BIND>:5173`.
- **Why two bindings:** binding only the LAN IP would break `http://localhost:5173` on the host, and `APP_ORIGIN` is `localhost`. A single `${DEV_WEB_BIND:-127.0.0.1}` mapping has this problem.

### 2. Makefile

Replace the first line with:

```make
DEV_WEB_BIND := $(shell sed -n 's/^DEV_WEB_BIND=//p' .env.dev 2>/dev/null | tail -n 1 | tr -d '\r')
COMPOSE_DEV = docker compose -f compose.dev.yaml $(if $(DEV_WEB_BIND),-f compose.dev.lan.yaml) --env-file .env.dev
```

- Commented lines (`# DEV_WEB_BIND=...`) must not match. The `^` anchor handles this.
- **`--env-file` is required.** Compose reads `env_file:` only for container environments, not for `${...}` in compose files. Without `--env-file`, the override's interpolation fails.
- On a fresh clone `.env.dev` does not exist yet, so `DEV_WEB_BIND` is empty, which is correct. The `dev` target creates `.env.dev` before it calls Compose.
- Every target that uses `$(COMPOSE_DEV)` must keep working (dev-down, dev-logs, db-migrate, check, …). Run them as listed in Validation.
- Equivalent shell is fine if it behaves the same. Keep it at the top of the Makefile next to `COMPOSE_DEV`.

### 3. `make dev` output

After the existing two `echo` lines, print the LAN URL when it is configured:

- Read `DEV_LAN_ORIGIN` from `.env.dev` with a small shell snippet (`grep`/`sed`). Ignore lines that are commented out.
- If it has a value, print `Web (LAN): <value>`. Otherwise print nothing extra.
- Keep the snippet a single readable recipe line or two. No new script files.

### 4. `.env.example`

Replace the current `DEV_LAN_ORIGIN` comment block with:

```dotenv
# Optional, dev only: open the web app from other devices on the same LAN.
# Set both, using this machine's LAN IPv4 (not a Docker, VPN or Tailscale address).
# DEV_WEB_BIND also publishes the web port 5173 on that IP (localhost keeps working); the API and DB stay on localhost.
# DEV_LAN_ORIGIN lets the API accept writes from that address.
# DEV_WEB_BIND=192.168.1.100
# DEV_LAN_ORIGIN=http://192.168.1.100:5173
```

Both stay commented out, so a fresh `.env.dev` keeps the localhost-only default.

### 5. `README.md`

Rewrite the LAN bullet so that it:
- says the default is localhost only;
- tells the reader to set **both** `DEV_WEB_BIND` and `DEV_LAN_ORIGIN` in `.env.dev`, then run `make dev`;
- links to `docs/ENVIRONMENTS.md` for the steps and caveats.

Keep it to 3–5 lines. The two variables stay independent:
- `DEV_WEB_BIND` alone: the page loads on the LAN, but writes get `403`.
- `DEV_LAN_ORIGIN` alone: nothing is reachable from the LAN.

`docs/ENVIRONMENTS.md` already explains this, so the README does not need to.

### 6. Env tests (`apps/api/src/env.test.ts`)

Test `envSchema` / `loadEnv` from `./env.js` with a minimal valid base object (`NODE_ENV`, `DATABASE_URL`, `APP_ORIGIN`, `COOKIE_SECURE`, `TRUST_PROXY`). Cover:
- `development` + `DEV_LAN_ORIGIN=http://192.168.1.100:5173` → accepted, and the value is returned.
- `development` without `DEV_LAN_ORIGIN` → accepted, and the value is `undefined`.
- `production` + `DEV_LAN_ORIGIN` → rejected, and the issue path is `DEV_LAN_ORIGIN`.
- `test` + `DEV_LAN_ORIGIN` → rejected.
- `development` + `DEV_LAN_ORIGIN=not-a-url` → rejected.

Pure schema tests only: no DB, no app instance. Follow the style of the existing `*.test.ts` files in `apps/api/src`.

## Allowed dependencies

None.

## Acceptance criteria

- [ ] Work is on `fix/dev-lan-access`. The code commit(s) contain no `docs/` files.
- [ ] Without `DEV_WEB_BIND`, the stack publishes the web port on `127.0.0.1:5173` only, and `compose.dev.lan.yaml` is not loaded.
- [ ] With `DEV_WEB_BIND=192.168.6.28`, the web port is published on both `127.0.0.1:5173` and `192.168.6.28:5173`. The db and api ports stay on `127.0.0.1` only.
- [ ] `http://localhost:5173` still works on the host in both modes.
- [ ] `make dev` prints `Web (LAN): …` only when `DEV_LAN_ORIGIN` is set and not commented out.
- [ ] `env.test.ts` covers the five cases above and passes.
- [ ] The existing API origin changes and the `decisions.test.ts` case are unchanged in behaviour.
- [ ] `make check` passes.

## Validation

Run and include the output in the report.

1. Default binding. With `DEV_WEB_BIND` absent or commented out in `.env.dev`:

   ```bash
   make -n dev | grep 'docker compose'      # no compose.dev.lan.yaml
   make dev
   ss -ltn | grep -E ':(5173|8787|5433)\b'  # expect only 127.0.0.1 for all three
   ```

2. Opt-in binding. Set `DEV_WEB_BIND=192.168.6.28` in `.env.dev`. This is the owner's LAN IP, listed by `ip -4 -brief address show scope global`. Then:

   ```bash
   make -n dev | grep 'docker compose'      # includes -f compose.dev.lan.yaml
   make dev
   ss -ltn | grep -E ':(5173|8787|5433)\b'  # expect 127.0.0.1:5173 AND 192.168.6.28:5173, 127.0.0.1:8787, 127.0.0.1:5433
   ```

3. Other targets still work:

   ```bash
   make dev-ps
   make check
   ```

Leave `.env.dev` with `DEV_WEB_BIND=192.168.6.28` and `DEV_LAN_ORIGIN=http://192.168.6.28:5173` set, so the owner can test from the phone. `.env.dev` is gitignored. Do not commit it.

Do not write render/snapshot/E2E smoke tests (see Testing policy in CLAUDE.md).

## Report back (required format)

1. Summary of what was done
2. Files changed (list) and commit hash(es)
3. Validation command output (trimmed)
4. Deviations from this handoff and why
5. Known issues / open questions
6. What the owner should check: on a phone on the same Wi-Fi, open `http://192.168.6.28:5173`, create a decision, open the case and press "Đi thôi". Saving must succeed. On the Tailscale address (`100.85.7.15:5173`) the page must **not** load.
