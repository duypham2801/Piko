COMPOSE_DEV = docker compose -f compose.dev.yaml

.DEFAULT_GOAL := help

.PHONY: help dev dev-down dev-logs dev-ps dev-install db-generate db-migrate db-psql check dev-reset-db

help: ## Show available development targets
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z0-9_-]+:.*##/ {printf "%-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Start the development database, API and web app
	@if [ ! -f .env.dev ]; then cp .env.example .env.dev; echo 'Created .env.dev from .env.example; review it before use.'; fi
	@$(COMPOSE_DEV) up -d --build
	@echo 'Web: http://localhost:5173'
	@echo 'API: http://localhost:8787'

dev-down: ## Stop the development stack and keep its volumes
	@$(COMPOSE_DEV) down

dev-logs: ## Follow the last 100 lines of development logs
	@$(COMPOSE_DEV) logs -f --tail=100

dev-ps: ## Show development service status
	@$(COMPOSE_DEV) ps

dev-install: ## Re-run the dependency installation service
	@$(COMPOSE_DEV) run --rm --no-deps install pnpm install --frozen-lockfile

db-generate: ## Generate Drizzle migrations in a one-off container
	@$(COMPOSE_DEV) run --rm --no-deps install pnpm --filter @wswd/api db:generate

db-migrate: ## Apply Drizzle migrations to the development database
	@$(COMPOSE_DEV) run --rm install pnpm --filter @wswd/api db:migrate

db-psql: ## Open psql in the development database container
	@$(COMPOSE_DEV) exec db sh -c 'psql -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"'

check: ## Run typecheck, lint and tests in the development container
	@$(COMPOSE_DEV) run --rm --no-deps install pnpm check

dev-reset-db: ## Destructively remove only the development database volume
	@read -r -p 'This removes all data in wswd-dev_pgdata. Continue? [y/N] ' answer; case "$$answer" in y|Y) ;; *) echo 'Cancelled.'; exit 1;; esac; \
	$(COMPOSE_DEV) down; \
	if docker volume inspect wswd-dev_pgdata >/dev/null 2>&1; then docker volume rm wswd-dev_pgdata; fi
