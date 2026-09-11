# Intake Telegram poller + local operator console — Docker project "vdp-intake".
ROOT := $(abspath ../..)
export INTAKE_WORKSPACE_HOST ?= $(ROOT)
export INTAKE_WORKSPACE ?= /workspace

.PHONY: up down logs restart ps build test console-url fe-sync fe-dev fe-build fe-test smoke

up: fe-build
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart intake

logs:
	docker compose logs -f intake

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

fe-dev:
	cd fe && npm install && npm run dev -- --port 5174 --host 127.0.0.1

fe-build:
	cd fe && npm install && npm run build

fe-test:
	cd fe && npm install && npx --yes vitest@3.2.4 run src/lib/api/client.test.ts

smoke:
	chmod +x scripts/smoke-console.sh
	./scripts/smoke-console.sh
