# HANDOFF 9-1 — Prod edge behind Cloudflare Tunnel, and backup copies

You are the implementer for the project PIKO in this repository.
Read `CLAUDE.md` first. You are in the **Implementer** role:
- Implement only this task.
- Do not change architecture or add dependencies.
- Stop and report if anything conflicts.

## Context

Phase 9 ships the first prod release, `v0.1.0`. **D-037** (`docs/DECISIONS.md`) fixes where it runs:
- **Host:** the owner's own machine, not a rented VPS.
- **Edge:** a Cloudflare Tunnel. A `cloudflared` daemon already runs **on the host**, outside Docker. The owner will add one public hostname in Cloudflare that points at `http://localhost:<HTTP_PORT>` on that machine.
- **TLS:** Cloudflare terminates TLS. Nothing is port-forwarded on the router.

The current prod edge assumes the opposite (`compose.prod.yaml` service `caddy`, `docker/Caddyfile`):
- **Caddy publishes 80 and 443 (+443/udp) on all host interfaces.** It obtains certificates with ACME (`SITE_ADDRESS` = a bare domain, `ACME_EMAIL`). It persists them in the `caddy_data` / `caddy_config` volumes.
- **The api trusts `X-Forwarded-For`.** It reads the **first** value when `TRUST_PROXY=true`, in `clientIp()` in `apps/api/src/auth/session.middleware.ts`. Caddy writes that header today from the TCP peer address.
- **Behind the tunnel, the TCP peer of every request is the host `cloudflared`.** It reaches Caddy through Docker's published port, so the peer is a Docker bridge gateway (a private address).
- **So every visitor would share one guest rate-limit bucket** (`GUEST_RATE_LIMIT_PER_HOUR`, 20 per hour). After 20 new visitors in an hour, nobody new could start a session.
- **Cloudflare sends the real client address in `CF-Connecting-IP`.**

Backups (`make prod-backup` in `Makefile`) write mode-600 custom-format dumps into `./backups` and keep the 30 newest. `prod-deploy` already backs up before migrating whenever the `piko-prod_pgdata` volume exists (fixed in FR-1). D-037 asks for two things on top:
- **A daily automatic dump.** The owner schedules it with host cron or a systemd timer. The architect writes that part of the runbook. Your part is to make `make prod-backup` safe to run unattended. It already uses `exec -T`; confirm it needs no TTY and no interactive input.
- **One command that copies the newest dump to another disk or machine.** This is the minimal off-site copy.

## Scope
- A. A tunnel-only prod edge in `docker/Caddyfile`, `compose.prod.yaml` and `.env.prod.example`.
- B. A real client IP from `CF-Connecting-IP`, passed to the api.
- C. `make prod-backup-copy`.
- D. A local verification run (see Validation). Clean up afterwards.

## Out of scope (do NOT do)
- `docs/**`. The architect updates `ENVIRONMENTS.md`, `TOPOLOGY.md` and the plan.
- Any `cloudflared` service or container, and any Cloudflare account or DNS configuration.
- Scheduling backups: no cron files, no systemd units, no backup container.
- **Application code** (`apps/**`, `packages/**`):
  - The api already does the right thing once `X-Forwarded-For` holds the real IP.
  - If you find otherwise, stop and report.
- `docker/Dockerfile`, apart from what Caddy strictly needs to run without ACME. Expect no change.
- Dependencies, migrations.
- `make prod-build`, `prod-deploy`, `prod-rollback`, `prod-restore`. Change them only where a removed variable (`HTTPS_PORT`, `ACME_EMAIL`, `SITE_ADDRESS`) forces it.
- Creating, tagging or pushing a real release. Do not push the throwaway tag from the Validation section.

## Files to create / modify
- `docker/Caddyfile`: HTTP-only site, real client IP.
- `compose.prod.yaml`: `caddy` ports, environment and volumes.
- `.env.prod.example`: the tunnel variables and comments.
- `Makefile`: `prod-backup-copy`, plus `.PHONY` and help text.

## Requirements

### A — Tunnel-only edge
- **Caddy serves plain HTTP on container port 80.**
  - No ACME, no automatic HTTPS, no HTTP→HTTPS redirect.
  - Use a fixed site address such as `:80` (or `http://`), and `auto_https off` in the global options.
  - Remove `SITE_ADDRESS` and `ACME_EMAIL` everywhere: the Caddyfile, compose and `.env.prod.example`.
- **Keep everything else in the Caddyfile unchanged:**
  - compression, the JSON log
  - the **whole `header` block**, including `Strict-Transport-Security` (visitors reach the site over Cloudflare HTTPS) and the CSP
  - `/api/*` → `api:8787`
  - asset caching, the SPA fallback
  - the `:8081` healthcheck site
- **Publish Caddy on loopback only:** `127.0.0.1:${HTTP_PORT:-8080}:80`.
  - Remove the 443 TCP/UDP mappings and `HTTPS_PORT`.
  - Nothing in `piko-prod` may listen on a non-loopback host interface. Check with `docker compose ... config` and with `ss -ltn` during Validation.
- **Volumes:** without ACME, Caddy stores no certificates.
  - Replace the `caddy_data` / `caddy_config` named volumes with `tmpfs` mounts for `/data` and `/config`. They must stay writable under `read_only: true`.
  - Remove the two volumes from the top-level `volumes:`.
  - Keep `pgdata`.
  - **If Caddy fails to start without them, stop and report.** Do not re-add persistent volumes.
- **Keep the hardening exactly as it is:** `read_only`, `cap_drop: ALL`, `no-new-privileges`, non-root user, healthcheck, memory and pids limits, log rotation, `restart`.

### B — Real client IP
- **In the Caddy global `servers` options, trust only private and loopback peers:** `trusted_proxies static private_ranges`.
- **Take the client IP from `CF-Connecting-IP`:** `client_ip_headers CF-Connecting-IP`.
  - If the header is absent (local requests without the tunnel), Caddy falls back to the TCP peer.
- **In the `/api/*` `reverse_proxy`, overwrite the forwarded header with the resolved client IP:** `header_up X-Forwarded-For {client_ip}`.
  - The api reads the first `X-Forwarded-For` value, so it must be exactly one address.
  - A client-supplied `X-Forwarded-For` must never reach the api.
- **Update the obsolete comment** ("Keep trusted_proxies unset…") so it explains the new trust model in one or two lines:
  - only the host tunnel can reach the loopback-bound port
  - `CF-Connecting-IP` is therefore trusted
- **Keep `TRUST_PROXY=true`** in `.env.prod.example`, with a comment saying that Caddy sets `X-Forwarded-For` from `CF-Connecting-IP`.

### C — `make prod-backup-copy DEST=<directory>`
- **Copies the newest `backups/piko-prod-*.dump`**, by modification time, into the existing directory `DEST`. `DEST` can be a mounted disk or a network share.
- **Errors:** fail with a clear message and a non-zero exit, without copying anything, when:
  - `DEST` is not set
  - `DEST` is not an existing writable directory
  - no dump exists
- **No partial file under the final name:**
  - copy to `<name>.partial` inside `DEST`
  - verify that the SHA-256 of the copy equals the source (`sha256sum`)
  - then rename it to the final name
  - on a mismatch, delete the partial file and fail
- **Keep the dump mode 600** at the destination.
- **Never delete or prune anything in `DEST`.** Retention there is the owner's choice.
- **Output:** print the copied path and the SHA-256.
- **Style:** follow the style of the existing `prod-*` targets. Use `@` lines, the same error wording, a `##` help comment and `.PHONY`.
- **Use only tools already used in the Makefile or present in coreutils:** `cp`/`install`, `sha256sum`, `find`, `mv`.
- **Do not require `.env.prod` or a running stack.** The target only reads `backups/`.
- **Make `make prod-backup` safe for cron:** it must not prompt and must not need a TTY. It already uses `exec -T`. Report what you verified; change it only if something interactive is found.

### `.env.prod.example`
- Rewrite the header comment for the tunnel model:
  - **Local rehearsal:** `HTTP_PORT=8080`, `APP_ORIGIN=http://localhost:8080`, `COOKIE_SECURE=false`.
  - **Behind the tunnel:** `APP_ORIGIN=https://<public hostname>`, `COOKIE_SECURE=true`. The Cloudflare public hostname points at `http://localhost:<HTTP_PORT>`.
  - **The password:** generated with `openssl rand -hex 32`, kept in sync between `POSTGRES_PASSWORD` and `DATABASE_URL`.
- Keep every other variable and its comment.

## Allowed dependencies
- None.

## Acceptance criteria
- [ ] `docker/Caddyfile` has no ACME, email or HTTPS site. The header block is unchanged (byte-for-byte apart from indentation, if any). `/api/*` sets `X-Forwarded-For` to `{client_ip}`.
- [ ] `git grep -nE "SITE_ADDRESS|ACME_EMAIL|HTTPS_PORT|caddy_data|caddy_config" -- ':!docs'` is empty.
- [ ] During the Validation run, `ss -ltn` shows the stack's published port only on `127.0.0.1`. No `0.0.0.0:80`, `:443` or `:8080`.
- [ ] Through `http://localhost:8080`:
  - `/` loads the app
  - `/api/healthz` returns `{"status":"ok","db":"ok","version":"<tag>"}`
  - the response headers include the CSP and HSTS
- [ ] **Real IP (with `GUEST_RATE_LIMIT_PER_HOUR=2` for the run):** each request below is a cookie-less `GET /api/me`.
  - Two requests with `CF-Connecting-IP: 203.0.113.1` → `200`.
  - A third with `203.0.113.1` → `429`.
  - One with `203.0.113.2` → `200`.
  - One with `CF-Connecting-IP: 203.0.113.2` **and** `X-Forwarded-For: 198.51.100.9` → `200`. It counts against `203.0.113.2`: send it as that address's second request, then a third `203.0.113.2` request gets `429`.
  - Report every status code in order.
- [ ] `make prod-backup` produces a dump. `make prod-backup-copy DEST=/tmp/piko-backup-copy-test` copies it, mode 600, same SHA-256, and prints both.
- [ ] `make prod-backup-copy` with no `DEST`, with a missing directory, or with an empty `backups/` exits non-zero with a clear message and creates nothing.
- [ ] `make check` passes (domain 48, api 65, 0 lint warnings). `pnpm-lock.yaml` is unchanged.
- [ ] After Validation, the machine is back to its prior state (see the cleanup list).

## Validation

**Before anything else**, run the safety check below:
- **If the volume `piko-prod_pgdata` exists, or a `piko-prod` container is running, STOP and report.** It may be the owner's real prod.
- If `.env.prod` exists, copy it to `.env.prod.bak-9-1` first and restore it afterwards, byte for byte.

```bash
docker volume inspect piko-prod_pgdata >/dev/null 2>&1 && echo "STOP: prod volume exists"
docker ps --filter label=com.docker.compose.project=piko-prod --format '{{.Names}}'
[ -f .env.prod ] && cp -p .env.prod .env.prod.bak-9-1
```

**Throwaway local run:**
1. Write a local-test `.env.prod` from `.env.prod.example` with:
   - `HTTP_PORT=8080`
   - `APP_ORIGIN=http://localhost:8080`
   - `COOKIE_SECURE=false`
   - `GUEST_RATE_LIMIT_PER_HOUR=2`
   - a fresh `openssl rand -hex 32` password, in both places
2. Commit your work, then create a **local, unpushed** tag on that commit: `git tag v0.0.0-9-1-test`.
3. Build, deploy and check:
   ```bash
   make prod-config
   make prod-build TAG=v0.0.0-9-1-test
   make prod-deploy TAG=v0.0.0-9-1-test
   ss -ltnp | grep -E ':(80|443|8080)\b'
   curl -si http://localhost:8080/ | head -20
   curl -s http://localhost:8080/api/healthz
   # real-IP sequence from the acceptance criteria, with curl -s -o /dev/null -w '%{http_code}\n'
   make prod-backup
   mkdir -p /tmp/piko-backup-copy-test && make prod-backup-copy DEST=/tmp/piko-backup-copy-test
   ls -l /tmp/piko-backup-copy-test && sha256sum backups/piko-prod-*.dump /tmp/piko-backup-copy-test/*.dump
   make prod-backup-copy; make prod-backup-copy DEST=/nonexistent; echo "exit=$?"
   ```

**Cleanup (required):**
- `make prod-down`.
- Remove the `piko-prod_pgdata` volume, which holds test data only, created by this run.
- Remove `.deploy/`, the test dumps under `backups/` and `/tmp/piko-backup-copy-test`.
- Remove the `piko-api:v0.0.0-9-1-test` / `piko-web:v0.0.0-9-1-test` images.
- Delete the tag: `git tag -d v0.0.0-9-1-test`.
- Restore `.env.prod` from `.env.prod.bak-9-1`, or delete the test `.env.prod` if none existed, and delete the `.bak` file.
- Finally:
  ```bash
  make check
  git status --short
  git diff --stat main...
  ```

Do not write render/snapshot/E2E smoke tests, and do not add the curl sequence to the repo (see Testing policy in CLAUDE.md).

## Git
- Create the integration branch `feat/phase-9-release` from `main` if it does not exist. Then create the task branch `feat/9-1-tunnel-edge` from it.
- Commits (suggested):
  - `feat(prod): HTTP-only Caddy behind Cloudflare Tunnel with real client IP`
  - `feat(prod): copy the newest backup to another directory`
- Do not merge or push.

## Report back (required format)
1. Summary of what was done
2. Files changed (list)
3. Validation output (trimmed):
   - `make check` counts and the lint summary
   - the `ss` line
   - the `/` response headers
   - the healthz body
   - the real-IP status sequence
   - the backup copy listing and both SHA-256 values
   - the error-path messages
4. Deviations from this handoff and why (for example, if Caddy needs a writable path you had to add)
5. Known issues / open questions. In particular, anything the owner must set in Cloudflare (the hostname target, SSL mode, features that inject scripts the CSP would block).
6. Confirmation that every cleanup step was done, and that `.env.prod` is byte-identical to before (`cmp`)
