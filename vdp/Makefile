.PHONY: deps test test-integration test-adapters build db-setup db-migrate compose-db-migrate run-hub run-core run smoke stop compose-up compose-up-prod compose-down compose-ps compose-e2e compose-fe-smoke compose-fe-refresh compose-fe-prod-smoke compose-playwright lovable-seed-check integration-gate playwright-e2e docs-format-check release-gate image-build image-push image-build-push compose-release-config-check compose-release-up deploy-alpha deploy-beta deploy-gamma rollback-alpha rollback-beta rollback-gamma test-cd-scripts

CORE_DIR := core
HUB_DIR := hub
CORE_BIN := bin/vdp-core
HUB_BIN := bin/vdp-hub

IMAGE_REGISTRY ?= ghcr.io
IMAGE_NAMESPACE ?= $(shell git -C .. config --get remote.origin.url 2>/dev/null | sed -E 's#.*[:/]([^/]+)/[^/]+(\.git)?$$#\1#' | tr '[:upper:]' '[:lower:]' || echo viletech)
IMAGE_TAG ?= $(shell git -C .. rev-parse --short HEAD 2>/dev/null || echo local)
PIN_FILE ?= .release-images.env

export DATABASE_URL_CORE ?= postgres://vdp_core:vdp_core@localhost:5432/vdp_core?sslmode=disable
export DATABASE_URL_HUB ?= postgres://vdp_hub:vdp_hub@localhost:5432/vdp_hub?sslmode=disable
export STORE_DRIVER ?= postgres
export HUB_URL ?= http://localhost:8081
export CORE_URL ?= http://localhost:8080
export HUB_SHARED_SECRET ?= vdp-s2s-dev-secret
export JWT_SECRET ?= vdp-core-dev-secret

deps:
	cd $(CORE_DIR) && go mod download
	cd $(HUB_DIR) && go mod download
	cd shared && go mod download
	cd mail-gateway && go mod download
	cd sms-gateway && go mod download
	cd delivery && go mod download

test:
	cd $(CORE_DIR) && go test ./...
	cd $(HUB_DIR) && go test ./...
	cd shared && go test ./...
	cd mail-gateway && go test ./...
	cd sms-gateway && go test ./...
	cd delivery && go test ./...

test-integration:
	cd $(CORE_DIR) && go test -tags=integration ./...
	cd $(HUB_DIR) && go test -tags=integration ./...

test-adapters:
	cd $(HUB_DIR) && go test ./internal/adapters/...

build:
	mkdir -p bin
	cd $(CORE_DIR) && go build -o ../$(CORE_BIN) ./cmd/api
	cd $(HUB_DIR) && go build -o ../$(HUB_BIN) ./cmd/api

db-setup:
	psql -h localhost -d postgres -v ON_ERROR_STOP=1 -c "DO \$$\$$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vdp_core') THEN CREATE ROLE vdp_core LOGIN PASSWORD 'vdp_core'; END IF; IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vdp_hub') THEN CREATE ROLE vdp_hub LOGIN PASSWORD 'vdp_hub'; END IF; END \$$\$$;"
	psql -h localhost -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='vdp_core'" | grep -q 1 || psql -h localhost -d postgres -c "CREATE DATABASE vdp_core OWNER vdp_core;"
	psql -h localhost -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='vdp_hub'" | grep -q 1 || psql -h localhost -d postgres -c "CREATE DATABASE vdp_hub OWNER vdp_hub;"
	psql -h localhost -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE vdp_core TO vdp_core; GRANT ALL PRIVILEGES ON DATABASE vdp_hub TO vdp_hub;"
	$(MAKE) db-migrate

db-migrate:
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/001_core.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/002_extended.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/003_seed.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/004_auth_org_r2.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/005_r4_docs_domain.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/006_r6_rate_docs.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/007_r3_contracts.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/008_r4_docs_parity.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/009_r5_multi_order.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/010_r9_extended.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/011_r10_bank.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/012_b2_org_signer.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/013_bank_org_client_type.sql
	PGPASSWORD=vdp_core psql -h localhost -U vdp_core -d vdp_core -v ON_ERROR_STOP=1 -f $(CORE_DIR)/migrations/014_notifications.sql
	PGPASSWORD=vdp_hub psql -h localhost -U vdp_hub -d vdp_hub -v ON_ERROR_STOP=1 -f $(HUB_DIR)/migrations/001_hub.sql
	PGPASSWORD=vdp_hub psql -h localhost -U vdp_hub -d vdp_hub -v ON_ERROR_STOP=1 -f $(HUB_DIR)/migrations/002_hub.sql

# Default compose path: Postgres for core+hub+fe (not memory).
compose-db-migrate:
	@chmod +x scripts/compose-db-migrate.sh
	@./scripts/compose-db-migrate.sh

compose-up:
	docker compose up -d --build
	@$(MAKE) compose-db-migrate
	docker compose restart core hub
	@echo "waiting for core+hub+fe health..."
	@ok=0; for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do \
		if curl -sf http://127.0.0.1:8080/api/v1/health >/dev/null && \
		   curl -sf http://127.0.0.1:8081/api/v1/health >/dev/null && \
		   curl -sf http://127.0.0.1:5173/ >/dev/null; then \
			ok=1; break; \
		fi; \
		sleep 2; \
	done; \
	if [ "$$ok" != "1" ]; then echo "health timeout"; docker compose ps; exit 1; fi
	@echo "core+hub+fe healthy (STORE_DRIVER=postgres)"
	@$(MAKE) compose-fe-smoke
	@echo "UI  http://localhost:5173"
	@echo "API http://localhost:8080"

compose-up-prod:
	docker compose --profile prod up -d --build
	@echo "waiting for core+hub+fe-prod health..."
	@ok=0; for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do \
		if curl -sf http://127.0.0.1:8080/api/v1/health >/dev/null && \
		   curl -sf http://127.0.0.1:8081/api/v1/health >/dev/null && \
		   curl -sf http://127.0.0.1:3000/login >/dev/null; then \
			ok=1; break; \
		fi; \
		sleep 2; \
	done; \
	if [ "$$ok" != "1" ]; then echo "health timeout"; docker compose ps; exit 1; fi
	@echo "core+hub+fe-prod healthy"
	@$(MAKE) compose-fe-prod-smoke
	@echo "UI (prod) http://localhost:3000"
	@echo "API       http://localhost:8080"

compose-fe-smoke:
	@chmod +x scripts/compose-fe-smoke.sh
	@./scripts/compose-fe-smoke.sh

# Refresh fe_node_modules volume (asks interactively unless FE_REFRESH=1 or --yes).
compose-fe-refresh:
	@chmod +x scripts/compose-fe-refresh.sh
	@./scripts/compose-fe-refresh.sh $(if $(FE_REFRESH),--yes,)

compose-fe-prod-smoke:
	@chmod +x scripts/compose-fe-prod-smoke.sh
	@./scripts/compose-fe-prod-smoke.sh

compose-down:
	docker compose down

compose-ps:
	docker compose ps

run-hub: build
	PORT=8081 STORE_DRIVER="$(STORE_DRIVER)" DATABASE_URL="$(DATABASE_URL_HUB)" HUB_SHARED_SECRET="$(HUB_SHARED_SECRET)" CORE_URL="$(CORE_URL)" ./$(HUB_BIN)

run-core: build
	PORT=8080 STORE_DRIVER="$(STORE_DRIVER)" DATABASE_URL="$(DATABASE_URL_CORE)" HUB_URL="$(HUB_URL)" HUB_SHARED_SECRET="$(HUB_SHARED_SECRET)" JWT_SECRET="$(JWT_SECRET)" ./$(CORE_BIN)

run: build stop
	@mkdir -p .run
	PORT=8081 STORE_DRIVER="$(STORE_DRIVER)" DATABASE_URL="$(DATABASE_URL_HUB)" HUB_SHARED_SECRET="$(HUB_SHARED_SECRET)" CORE_URL="$(CORE_URL)" ./$(HUB_BIN) > .run/hub.log 2>&1 & echo $$! > .run/hub.pid
	PORT=8080 STORE_DRIVER="$(STORE_DRIVER)" DATABASE_URL="$(DATABASE_URL_CORE)" HUB_URL="$(HUB_URL)" HUB_SHARED_SECRET="$(HUB_SHARED_SECRET)" JWT_SECRET="$(JWT_SECRET)" ./$(CORE_BIN) > .run/core.log 2>&1 & echo $$! > .run/core.pid
	@echo "hub=$$(cat .run/hub.pid) core=$$(cat .run/core.pid) store=$(STORE_DRIVER)"
	@for i in 1 2 3 4 5 6 7 8 9 10; do curl -sf http://127.0.0.1:8081/api/v1/health >/dev/null && curl -sf http://127.0.0.1:8080/api/v1/health >/dev/null && break; sleep 0.3; done
	@$(MAKE) smoke

stop:
	@if [ -f .run/core.pid ]; then kill $$(cat .run/core.pid) 2>/dev/null || true; rm -f .run/core.pid; fi
	@if [ -f .run/hub.pid ]; then kill $$(cat .run/hub.pid) 2>/dev/null || true; rm -f .run/hub.pid; fi
	@for port in 8080 8081; do pid=$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true); [ -n "$$pid" ] && kill $$pid 2>/dev/null || true; done
	@sleep 0.2

smoke:
	@curl -sf http://127.0.0.1:8081/api/v1/health >/dev/null && echo "hub health ok"
	@curl -sf http://127.0.0.1:8080/api/v1/health >/dev/null && echo "core health ok"
	@curl -sf -X POST http://127.0.0.1:8080/api/v1/auth/login \
		-H 'Content-Type: application/json' \
		-d '{"email":"user@vdp.local","password":"user"}' | grep -q token && echo "login ok"

compose-e2e: compose-up
	@chmod +x scripts/compose-e2e.sh
	@./scripts/compose-e2e.sh

# RD10: unit gates + compose journey (RD1–RD9 spots on shared stack).
integration-gate:
	cd fe && npm test
	$(MAKE) lovable-seed-check
	$(MAKE) test
	$(MAKE) compose-e2e

# Keep fe/src/lib/ved/mock.ts byte-identical to lovable-vdp/dev0; demo patches → demo-seed-overlay.ts.
lovable-seed-check:
	@chmod +x scripts/lovable-seed-check.sh
	@./scripts/lovable-seed-check.sh

# RD11: browser E2E via Docker (Linux browsers; works when host `playwright install` is unsupported).
compose-playwright:
	@./scripts/compose-playwright.sh

# RD11: local npm run when Chromium is installed on host; else use compose-playwright.
playwright-e2e: compose-playwright

docs-format-check:
	@chmod +x scripts/docs-format-check.sh
	@./scripts/docs-format-check.sh

# RH4: pre-handover — all reliability gates (requires compose for e2e/playwright).
release-gate:
	$(MAKE) test-integration
	$(MAKE) test-adapters
	$(MAKE) integration-gate
	@echo "release-gate: pause 65s for gateway rate-limit window before browser E2E"
	@sleep 65
	$(MAKE) playwright-e2e
	$(MAKE) docs-format-check
	@echo "release-gate green"

image-build:
	@chmod +x scripts/image-build-push.sh
	PUSH=0 IMAGE_REGISTRY="$(IMAGE_REGISTRY)" IMAGE_NAMESPACE="$(IMAGE_NAMESPACE)" IMAGE_TAG="$(IMAGE_TAG)" \
		PIN_FILE="$(PIN_FILE)" ./scripts/image-build-push.sh

image-push: image-build
	@chmod +x scripts/image-build-push.sh
	PUSH=1 IMAGE_REGISTRY="$(IMAGE_REGISTRY)" IMAGE_NAMESPACE="$(IMAGE_NAMESPACE)" IMAGE_TAG="$(IMAGE_TAG)" \
		PIN_FILE="$(PIN_FILE)" ./scripts/image-build-push.sh

image-build-push: image-push

compose-release-config-check:
	VDP_CORE_IMAGE="$${VDP_CORE_IMAGE:-example.local/vdp-core:check}" \
	VDP_HUB_IMAGE="$${VDP_HUB_IMAGE:-example.local/vdp-hub:check}" \
	VDP_DOCS_IMAGE="$${VDP_DOCS_IMAGE:-example.local/vdp-docs:check}" \
	VDP_MAIL_IMAGE="$${VDP_MAIL_IMAGE:-example.local/vdp-mail:check}" \
	VDP_SMS_IMAGE="$${VDP_SMS_IMAGE:-example.local/vdp-sms:check}" \
	VDP_FE_IMAGE="$${VDP_FE_IMAGE:-example.local/vdp-fe:check}" \
	JWT_SECRET="$${JWT_SECRET:-config-check}" \
	HUB_SHARED_SECRET="$${HUB_SHARED_SECRET:-config-check}" \
	docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod config >/dev/null
	@echo "compose release config ok"

compose-release-up:
	@test -f "$(PIN_FILE)" || (echo "missing $(PIN_FILE); run make image-build first" >&2; exit 1)
	@set -a && . "$(PIN_FILE)" && test -f .env.deploy && . .env.deploy; set +a; \
	docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod \
		up -d --no-build --scale fe=0
	@./scripts/wait-release-health.sh

deploy-alpha:
	@chmod +x scripts/deploy-compose-release.sh
	ENVIRONMENT=alpha PIN_FILE="$(PIN_FILE)" ./scripts/deploy-compose-release.sh

deploy-beta:
	@chmod +x scripts/deploy-compose-release.sh
	ENVIRONMENT=beta PIN_FILE="$(PIN_FILE)" ./scripts/deploy-compose-release.sh

deploy-gamma:
	@chmod +x scripts/deploy-compose-release.sh
	ENVIRONMENT=gamma PIN_FILE="$(PIN_FILE)" ./scripts/deploy-compose-release.sh

rollback-alpha:
	@chmod +x scripts/rollback-compose-release.sh
	ENVIRONMENT=alpha ./scripts/rollback-compose-release.sh

rollback-beta:
	@chmod +x scripts/rollback-compose-release.sh
	ENVIRONMENT=beta ./scripts/rollback-compose-release.sh

rollback-gamma:
	@chmod +x scripts/rollback-compose-release.sh
	ENVIRONMENT=gamma ./scripts/rollback-compose-release.sh

test-cd-scripts:
	@chmod +x scripts/test-cd-scripts.sh
	./scripts/test-cd-scripts.sh
