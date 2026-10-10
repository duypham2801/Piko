DEV_WEB_BIND := $(shell sed -n 's/^DEV_WEB_BIND=//p' .env.dev 2>/dev/null | tail -n 1 | tr -d '\r')
COMPOSE_DEV = docker compose -f compose.dev.yaml $(if $(DEV_WEB_BIND),-f compose.dev.lan.yaml) --env-file .env.dev
COMPOSE_PROD = docker compose -f compose.prod.yaml --env-file .env.prod

TAG ?= $(shell git describe --tags --exact-match 2>/dev/null)
APP_VERSION ?= $(shell if [ -s .deploy/current ]; then tr -d '\r\n' < .deploy/current; fi)
CONFIG_APP_VERSION = $(shell if [ -s .deploy/current ]; then tr -d '\r\n' < .deploy/current; else printf '%s' 'config-placeholder'; fi)
CURRENT_DEPLOY_TAG = $(shell if [ -s .deploy/current ]; then tr -d '\r\n' < .deploy/current; else printf '%s' '$(TAG)'; fi)

.DEFAULT_GOAL := help

.PHONY: help dev dev-down dev-logs dev-ps dev-install db-generate db-migrate db-psql check dev-reset-db \
	prod-build prod-deploy prod-rollback prod-backup prod-restore prod-down prod-ps prod-logs prod-config

help: ## Show available development targets
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "%-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Start the development database, API and web app
	@if [ ! -f .env.dev ]; then cp .env.example .env.dev; echo 'Created .env.dev from .env.example; review it before use.'; fi
	@$(COMPOSE_DEV) up -d --build
	@echo 'Web: http://localhost:5173'
	@echo 'API: http://localhost:8787'
	@lan_origin="$$(sed -n 's/^DEV_LAN_ORIGIN=//p' .env.dev 2>/dev/null | tail -n 1 | tr -d '\r')"; if [ -n "$$lan_origin" ]; then echo "Web (LAN): $$lan_origin"; fi

dev-down: ## Stop the development stack and keep its volumes
	@$(COMPOSE_DEV) down

dev-logs: ## Follow the last 100 lines of development logs
	@$(COMPOSE_DEV) logs -f --tail=100

dev-ps: ## Show development service status
	@$(COMPOSE_DEV) ps

dev-install: ## Re-run the dependency installation service
	@$(COMPOSE_DEV) run --rm --no-deps install pnpm install --frozen-lockfile

db-generate: ## Generate Drizzle migrations in a one-off container
	@$(COMPOSE_DEV) run --rm --no-deps install pnpm --filter @piko/api db:generate

db-migrate: ## Apply Drizzle migrations to the development database
	@$(COMPOSE_DEV) run --rm install pnpm --filter @piko/api db:migrate

db-psql: ## Open psql in the development database container
	@$(COMPOSE_DEV) exec db sh -c 'psql -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"'

check: ## Run typecheck, lint and tests in the development container
	@$(COMPOSE_DEV) run --rm --no-deps install pnpm check

dev-reset-db: ## Destructively remove only the development database volume
	@read -r -p 'This removes all data in piko-dev_pgdata. Continue? [y/N] ' answer; case "$$answer" in y|Y) ;; *) echo 'Cancelled.'; exit 1;; esac; \
	$(COMPOSE_DEV) down; \
	if docker volume inspect piko-dev_pgdata >/dev/null 2>&1; then docker volume rm piko-dev_pgdata; fi

prod-build: ## Build versioned production images from the exact git tag
	@if [ ! -f .env.prod ]; then echo 'Missing .env.prod. Copy .env.prod.example and configure it first.' >&2; exit 1; fi
	@if [ -z "$(TAG)" ]; then echo 'HEAD is not exactly at a git tag. Pass TAG=<tag> explicitly.' >&2; exit 1; fi
	@echo 'Building production images from git tag $(TAG)...'
	@git archive --format=tar "$(TAG)" | docker build -f docker/Dockerfile --target api-prod -t piko-api:$(TAG) -
	@git archive --format=tar "$(TAG)" | docker build -f docker/Dockerfile --target web-prod -t piko-web:$(TAG) -
	@docker image inspect piko-api:$(TAG) --format='piko-api:$(TAG) {{.Size}} bytes'
	@docker image inspect piko-web:$(TAG) --format='piko-web:$(TAG) {{.Size}} bytes'

prod-deploy: ## Deploy a tagged production release with a pre-migration backup
	@if [ ! -f .env.prod ]; then echo 'Missing .env.prod. Copy .env.prod.example and configure it first.' >&2; exit 1; fi
	@if [ -z "$(TAG)" ]; then echo 'HEAD is not exactly at a git tag. Pass TAG=<tag> explicitly.' >&2; exit 1; fi
	@if ! docker image inspect piko-api:$(TAG) >/dev/null 2>&1; then echo 'Missing image piko-api:$(TAG). Run make prod-build TAG=$(TAG).' >&2; exit 1; fi
	@if ! docker image inspect piko-web:$(TAG) >/dev/null 2>&1; then echo 'Missing image piko-web:$(TAG). Run make prod-build TAG=$(TAG).' >&2; exit 1; fi
	@if APP_VERSION="$(TAG)" $(COMPOSE_PROD) ps --status running -q db | grep -q .; then \
		if ! $(MAKE) --no-print-directory prod-backup APP_VERSION="$(CURRENT_DEPLOY_TAG)"; then \
			echo 'Production backup failed; no deployment changes were made.' >&2; \
			exit 1; \
		fi; \
	fi
	@if ! APP_VERSION="$(TAG)" $(COMPOSE_PROD) up -d --wait --remove-orphans; then \
		echo 'Production deploy failed. Review logs, then run make prod-rollback if a previous release exists.' >&2; \
		exit 1; \
	fi
	@mkdir -p .deploy
	@current="$$(if [ -s .deploy/current ]; then tr -d '\r\n' < .deploy/current; fi)"; \
	if [ -z "$$current" ]; then \
		: > .deploy/previous; \
	elif [ "$$current" != "$(TAG)" ]; then \
		printf '%s\n' "$$current" > .deploy/previous; \
	fi
	@printf '%s\n' "$(TAG)" > .deploy/current
	@echo 'Production release $(TAG) is running.'

prod-rollback: ## Roll back to the previous production image tag without rolling back the database
	@if [ ! -f .env.prod ]; then echo 'Missing .env.prod. Copy .env.prod.example and configure it first.' >&2; exit 1; fi
	@if [ ! -s .deploy/previous ]; then echo 'No previous release found in .deploy/previous.' >&2; exit 1; fi
	@previous="$$(tr -d '\r\n' < .deploy/previous)"; \
	current="$$(if [ -s .deploy/current ]; then tr -d '\r\n' < .deploy/current; fi)"; \
	if [ -z "$$current" ]; then echo 'No current release found in .deploy/current.' >&2; exit 1; fi; \
	if ! APP_VERSION="$$previous" $(COMPOSE_PROD) up -d --wait --remove-orphans; then \
		echo "Rollback to $$previous failed." >&2; exit 1; \
	fi; \
	printf '%s\n' "$$current" > .deploy/previous; \
	printf '%s\n' "$$previous" > .deploy/current; \
	echo "Rolled back to $$previous. Database migrations were not rolled back; D-016 requires backward-compatible migrations."

prod-backup: ## Create a mode-600 custom-format production database dump
	@if [ ! -f .env.prod ]; then echo 'Missing .env.prod. Copy .env.prod.example and configure it first.' >&2; exit 1; fi
	@if [ -z "$(APP_VERSION)" ]; then echo 'No current production release. Pass APP_VERSION=<tag> or deploy a release first.' >&2; exit 1; fi
	@mkdir -p backups
	@version="$$(if [ -s .deploy/current ]; then tr -d '\r\n' < .deploy/current; else printf '%s' '$(APP_VERSION)'; fi)"; \
	timestamp="$$(date -u +%Y%m%dT%H%M%SZ)"; \
	file="backups/piko-prod-$${timestamp}-$${version}.dump"; \
	partial="$${file}.partial"; \
	umask 077; \
	cleanup() { rm -f "$$partial"; }; \
	trap cleanup EXIT; \
	if ! APP_VERSION="$(APP_VERSION)" $(COMPOSE_PROD) exec -T db sh -c 'pg_dump -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" --format=custom' > "$$partial"; then \
		echo 'Backup failed: pg_dump did not complete; no backup was created.' >&2; \
		exit 1; \
	fi; \
	if [ ! -s "$$partial" ]; then \
		echo 'Backup failed: pg_dump produced an empty dump; no backup was created.' >&2; \
		exit 1; \
	fi; \
	mv "$$partial" "$$file"; \
	trap - EXIT; \
	find backups -maxdepth 1 -type f -name 'piko-prod-*.dump' -printf '%T@ %p\n' | sort -nr | tail -n +31 | cut -d' ' -f2- | while IFS= read -r old; do [ -z "$$old" ] || rm -f "$$old"; done; \
	echo "Backup: $$file"; \
	stat -c 'Size: %s bytes' "$$file"

prod-restore: ## Destructively restore a custom-format dump into the production database
	@if [ ! -f .env.prod ]; then echo 'Missing .env.prod. Copy .env.prod.example and configure it first.' >&2; exit 1; fi
	@if [ -z "$(APP_VERSION)" ]; then echo 'No current production release. Pass APP_VERSION=<tag> or deploy a release first.' >&2; exit 1; fi
	@if [ -z "$(FILE)" ]; then echo 'Usage: make prod-restore FILE=backups/piko-prod-....dump' >&2; exit 1; fi
	@if [ ! -f "$(FILE)" ]; then echo 'Restore file not found: $(FILE)' >&2; exit 1; fi
	@read -r -p 'This will destroy current production data and restore $(FILE). Continue? [y/N] ' answer; case "$$answer" in y|Y) ;; *) echo 'Cancelled.'; exit 1;; esac
	@set +e; \
	APP_VERSION="$(APP_VERSION)" $(COMPOSE_PROD) stop api; \
	restore_status=0; \
	APP_VERSION="$(APP_VERSION)" $(COMPOSE_PROD) exec -T db sh -c 'pg_restore --clean --if-exists --no-owner -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"' < "$(FILE)" || restore_status=$$?; \
	APP_VERSION="$(APP_VERSION)" $(COMPOSE_PROD) up -d --wait api; \
	exit $$restore_status

prod-down: ## Stop the production stack and keep its volumes
	@if [ ! -f .env.prod ]; then echo 'Missing .env.prod. Copy .env.prod.example and configure it first.' >&2; exit 1; fi
	@if [ -z "$(APP_VERSION)" ]; then echo 'No current production release. Pass APP_VERSION=<tag> or deploy a release first.' >&2; exit 1; fi
	@APP_VERSION="$(APP_VERSION)" $(COMPOSE_PROD) down

prod-ps: ## Show production service status
	@if [ ! -f .env.prod ]; then echo 'Missing .env.prod. Copy .env.prod.example and configure it first.' >&2; exit 1; fi
	@if [ -z "$(APP_VERSION)" ]; then echo 'No current production release. Pass APP_VERSION=<tag> or deploy a release first.' >&2; exit 1; fi
	@APP_VERSION="$(APP_VERSION)" $(COMPOSE_PROD) ps

prod-logs: ## Follow the last 100 lines of production logs
	@if [ ! -f .env.prod ]; then echo 'Missing .env.prod. Copy .env.prod.example and configure it first.' >&2; exit 1; fi
	@if [ -z "$(APP_VERSION)" ]; then echo 'No current production release. Pass APP_VERSION=<tag> or deploy a release first.' >&2; exit 1; fi
	@APP_VERSION="$(APP_VERSION)" $(COMPOSE_PROD) logs -f --tail=100

prod-config: ## Validate the production Compose configuration
	@if [ ! -f .env.prod ]; then echo 'Missing .env.prod. Copy .env.prod.example and configure it first.' >&2; exit 1; fi
	@APP_VERSION="$(CONFIG_APP_VERSION)" $(COMPOSE_PROD) config --quiet
