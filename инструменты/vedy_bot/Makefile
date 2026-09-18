# vedy_bot: Telegram poller + local operator console — Docker project "vedy_bot".
ROOT := $(abspath ../..)
export INTAKE_WORKSPACE_HOST ?= $(ROOT)
export INTAKE_WORKSPACE ?= /workspace

.PHONY: up down logs restart ps build test console-url fe-sync fe-dev fe-build fe-test smoke bridge-npm-install migrate-env

up: fe-build
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart vedy_bot

logs:
	docker compose logs -f vedy_bot

ps:
	docker compose ps

build: fe-build
	docker compose build

test:
	go test ./cmd/... ./internal/...

console-url:
	@echo "http://127.0.0.1:8787  (set INTAKE_CONSOLE_TOKEN; Authorization: Bearer …)"

fe-sync:
	chmod +x scripts/fe-sync.sh
	./scripts/fe-sync.sh

# CI=true → wipe node_modules + package-lock.json, then fresh npm install so
# platform optional deps (rolldown linux/WASI bindings) resolve on the runner.
# Avoids npm optional-deps + cache bug: https://github.com/npm/cli/issues/4828
# Local → npm install as usual (keeps committed lockfile).
fe-npm-install:
ifeq ($(CI),true)
	cd fe && rm -rf node_modules package-lock.json && npm install
else
	cd fe && npm install
endif

# Host `go run` needs agent-bridge/node_modules (@cursor/sdk). Docker image installs this in build.
bridge-npm-install:
	cd agent-bridge && npm install --omit=dev

# Copy legacy ~/.vdp-intake/env → ~/.vedy_bot/env when primary missing (chmod 600).
migrate-env:
	chmod +x scripts/migrate-env.sh
	./scripts/migrate-env.sh

fe-dev: fe-npm-install
	cd fe && npm run dev -- --port 5174 --host 127.0.0.1

fe-build: fe-npm-install
	cd fe && npm run build

fe-test: fe-npm-install
	cd fe && npx --yes vitest@3.2.4 run src/lib/api/client.test.ts

smoke:
	chmod +x scripts/smoke-console.sh
	./scripts/smoke-console.sh
