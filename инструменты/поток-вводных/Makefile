# Intake Telegram poller + local operator console — Docker project "vdp-intake".
ROOT := $(abspath ../..)
export INTAKE_WORKSPACE_HOST ?= $(ROOT)
export INTAKE_WORKSPACE ?= /workspace

.PHONY: up down logs restart ps build test console-url

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose restart intake

logs:
	docker compose logs -f intake

ps:
	docker compose ps

build:
	docker compose build

test:
	go test ./...

console-url:
	@echo "http://127.0.0.1:8787  (set INTAKE_CONSOLE_TOKEN; Authorization: Bearer …)"
