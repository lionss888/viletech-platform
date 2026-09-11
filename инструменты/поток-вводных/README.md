# Intake: Telegram poller + local console

Standalone tool under `инструменты/поток-вводных` (not the VDP product stack).

## Run

```bash
# ~/.vdp-intake/env
TELEGRAM_INTAKE_TOKEN=…
TELEGRAM_INTAKE_CHAT_IDS=-100…
INTAKE_CONSOLE_TOKEN=long-random
INTAKE_CONSOLE=1
INTAKE_CONSOLE_ADDR=127.0.0.1:8787

cd инструменты/поток-вводных
go run ./cmd/intake -hitl
```

Console: http://127.0.0.1:8787 — paste token, Authorization Bearer.

Docker: `make up` publishes 8787; set `INTAKE_CONSOLE_TOKEN` in env file. Inside compose bind is `0.0.0.0:8787`. One container serves API + Lovable SPA (Nitro behind Go reverse-proxy).

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

- Live thread from `thread/` JSONL (in + out mirrors), not only inbox
- HITL cards approve/decline; optional agent analyze/ask
- Send text (as intake and/or mirror to Telegram)
- Upload image/video/code files
- Write Cursor artifacts under `.cursor/plans/тгбот/` (plan or prompt)
- Delete a Telegram message by id
- Manager-safe “done” template (`comms.ManagerDone`) mirrored to the chat

## Tests

`make test` or `go test ./cmd/... ./internal/...`  
`make fe-test` / `make fe-build` for the SPA layer.  
`make smoke` — local Nitro + Go on :8791 (avoids Docker :8787): SPA HTML + `/api/thread` 401/200.

## Honesty gaps

- Lovable preview alone is not the live console until `fe/src/lib/api` is wired and intake is running — preview mocks ≠ production thread.
- Embed vanilla UI under `internal/console/ui/` is fallback only when SPA upstream/static is absent.
- Stickers/voice are not ingested.
- Media without intake trigger (`@bot` / `/vvod`) is mirrored into the thread only — it does not create an inbox HITL card.
- Bot API does not return history from before the poller started; the console is a live mirror from process start.
- Console is operator-only (bearer token on loopback), not a VED cabinet.
- Not full parity of all Telegram update types.
- Do not claim full Lovable-preview ↔ prod parity without smoke: SPA HTML from :8787 and `GET /api/thread` with token.
