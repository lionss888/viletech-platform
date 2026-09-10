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

- Thread from inbox JSONL; HITL cards approve/decline
- Send text (as intake and/or mirror to Telegram)
- Upload image/video/code files
- Write Cursor artifacts under `.cursor/plans/тгбот/` (plan or prompt)
- Delete a Telegram message by id
- Manager-safe “done” template mirrored to the chat

## Tests

`make test` or `go test ./...`

## Honesty gaps

Stickers/voice not ingested. Console is operator-only (token), not a VED cabinet.
