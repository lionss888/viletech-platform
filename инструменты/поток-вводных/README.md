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

Docker: `make up` publishes 8787; set `INTAKE_CONSOLE_TOKEN` in env file. Inside compose bind is `0.0.0.0:8787`.

## Console capabilities

- Live thread from `thread/` JSONL (in + out mirrors), not only inbox
- HITL cards approve/decline; optional agent analyze/ask
- Send text (as intake and/or mirror to Telegram)
- Upload image/video/code files
- Write Cursor artifacts under `.cursor/plans/тгбот/` (plan or prompt)
- Delete a Telegram message by id
- Manager-safe “done” template (`comms.ManagerDone`) mirrored to the chat

## Tests

`make test` or `go test ./...`

## Honesty gaps

- Stickers/voice are not ingested.
- Media without intake trigger (`@bot` / `/vvod`) is mirrored into the thread only — it does not create an inbox HITL card.
- Bot API does not return history from before the poller started; the console is a live mirror from process start.
- Console is operator-only (bearer token on loopback), not a VED cabinet.
- Not full parity of all Telegram update types.
