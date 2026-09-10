# Intake Telegram poller — own Docker Desktop project "vdp-intake" (not vdp product stack).
ROOT := $(abspath ../..)
export INTAKE_WORKSPACE_HOST ?= $(ROOT)
export INTAKE_WORKSPACE ?= /workspace

.PHONY: up down logs restart ps build

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
