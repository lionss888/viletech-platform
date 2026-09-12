# Intake: Telegram poller + local console

Standalone tool under `инструменты/поток-вводных` (not the VDP product stack).

## Run

```bash
# ~/.vdp-intake/env
TELEGRAM_INTAKE_TOKEN=…
TELEGRAM_INTAKE_CHAT_IDS=-100…          # manager / intake chat
TELEGRAM_OPERATOR_CHAT_IDS=-200…        # optional operator chat/DM
INTAKE_CONSOLE_TOKEN=long-random
INTAKE_CONSOLE=1
INTAKE_CONSOLE_ADDR=127.0.0.1:8787

cd инструменты/поток-вводных
go run ./cmd/intake -hitl
```

Console: http://127.0.0.1:8787 — paste token, Authorization Bearer.

Docker: `make up` first runs `fe-build` (host Nitro → `fe/.output`), then builds the image that copies that output — in-container vite/rolldown native deps fail on Docker Desktop. Set `INTAKE_CONSOLE_TOKEN` in env; port `8787`.

## Frontend (Lovable Interface Refresh)

UI lives in `fe/` (synced from GitHub `lionss888/interface-refresh`, not `vdp/fe`).

```bash
make fe-sync   # rsync from GitHub; preserves fe/src/lib/api/
make fe-dev    # Vite :5174, proxies /api and /health → :8787
make fe-build  # Nitro node-server → fe/.output
make fe-test   # API mapper unit tests
```

`fe-sync` excludes `src/lib/api/`, local Vite/proxy config, `node_modules/`, `.git/`, env files, and build outputs — do not put live API wiring only in Lovable cloud.

Dev: start intake on :8787, then `make fe-dev`. Prod/Docker: SPA on the same :8787 origin.

Optional demo mocks: `VITE_INTAKE_DEMO=1` (default is live Go API).

## Console capabilities

- Live thread from `thread/` JSONL (in + out mirrors), not only inbox; filter manager/operator
- HITL cards approve/decline; optional agent analyze/ask
- Send text (as intake and/or mirror to Telegram)
- Upload image/video/code files
- Cursor-grade `.plan.md` under `.cursor/plans/тгбот/` (frontmatter + todos) via API/UI
- Selective publish of selected text to manager or operator chat (sanitize)
- Delete a Telegram message by id
- Manager-safe “done” template (`comms.ManagerDone`) mirrored to the chat
- Header shows console Bearer vs agent `key_…` separately

## Analytics boundary

In-process package `internal/analytics`: one `Bundle` DTO (class, confidence, summary, conflicts, estimate) on HITL cards and planfile/API. Not a separate docker service; no external LLM HTTP.

## Tests

`make test` or `go test ./cmd/... ./internal/...`  
`make fe-test` / `make fe-build` for the SPA layer.  
`make smoke` — local Nitro + Go on :8791 (avoids Docker :8787): SPA HTML + `/api/thread` 401/200.

## Trigger matrix

| Вход | Лента (thread) | Inbox / HITL |
|---|---|---|
| `@бот` или `/vvod` (+ текст и/или медиа) | да | да (HITL при `-hitl`) |
| Сообщение/медиа без триггера | да | нет |
| `/help` | да (справка) | нет |
| Стикеры / голосовые | нет | нет |

Код маршрута: `normalize.RouteOf` / `CreatesHITLCard`.

## Honesty gaps

- Lovable preview alone is not the live console until `fe/src/lib/api` is wired and intake is running — preview mocks ≠ production thread.
- Embed vanilla UI under `internal/console/ui/` is fallback only when SPA upstream/static is absent.
- Stickers/voice are not ingested.
- Media without intake trigger (`@bot` / `/vvod`) is mirrored into the thread only — it does not create an inbox HITL card.
- Bot API does not return history from before the poller started; the console is a live mirror from process start.
- Console is operator-only (bearer token on loopback), not a VED cabinet; second TG operator chat is optional (`TELEGRAM_OPERATOR_CHAT_IDS`) — console remains the mirror.
- Plans are Cursor frontmatter/todos parity, not full CreatePlan MCP / auto-run from TG.
- Not full parity of all Telegram update types.
- Do not claim full Lovable-preview ↔ prod parity without smoke: SPA HTML from :8787 and `GET /api/thread` with token.
