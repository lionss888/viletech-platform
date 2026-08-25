.PHONY: deps test build db-setup db-migrate run-hub run-core run smoke stop

CORE_DIR := core
HUB_DIR := hub
CORE_BIN := bin/vdp-core
HUB_BIN := bin/vdp-hub

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

test:
	cd $(CORE_DIR) && go test ./...
	cd $(HUB_DIR) && go test ./...

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
	PGPASSWORD=vdp_hub psql -h localhost -U vdp_hub -d vdp_hub -v ON_ERROR_STOP=1 -f $(HUB_DIR)/migrations/001_hub.sql
	PGPASSWORD=vdp_hub psql -h localhost -U vdp_hub -d vdp_hub -v ON_ERROR_STOP=1 -f $(HUB_DIR)/migrations/002_hub.sql

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
