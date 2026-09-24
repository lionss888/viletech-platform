# vedy_bot: Telegram poller + local console

Standalone tool under `инструменты/vedy_bot` (not the VDP product stack).

## Run

```bash
# ~/.vedy_bot/env (or legacy ~/.vdp-intake/env)
TELEGRAM_INTAKE_TOKEN=…
TELEGRAM_INTAKE_CHAT_IDS=-100…          # manager / intake chat
TELEGRAM_OPERATOR_CHAT_IDS=-200…        # optional operator chat/DM
INTAKE_CONSOLE_TOKEN=long-random
INTAKE_CONSOLE=1
INTAKE_CONSOLE_ADDR=127.0.0.1:8787
CURSOR_API_KEY=crsr_…                # User API Key from API settings; key_… still accepted
INTAKE_AGENT_CLOUD=1                 # 0 = local cwd agent (P4)
# INTAKE_EMBEDDING_URL=https://api.openai.com/v1
# INTAKE_EMBEDDING_API_KEY=…
# INTAKE_EMBEDDING_MODEL=text-embedding-3-small
# INTAKE_TG_CURSOR=1                 # TG intake → Cursor (P2)
# INTAKE_HITL_MODE=hybrid            # rules|cursor|hybrid (P3)
# INTAKE_STAND_DRY_RUN=1             # stand jobs without real make (P5)
# INTAKE_VDP_ROOT=/path/to/vdp

cd инструменты/vedy_bot
make migrate-env          # ~/.vdp-intake/env → ~/.vedy_bot/env if needed
make bridge-npm-install   # host go run needs agent-bridge/node_modules
go run ./cmd/vedy_bot -hitl
```

Console: http://127.0.0.1:8787 — paste token, Authorization Bearer.

Docker (local build): `make up` first runs `fe-build` (host Nitro → `fe/.output`), then builds the image that copies that output — in-container vite/rolldown native deps fail on Docker Desktop. Set `INTAKE_CONSOLE_TOKEN` in env; port `8787`.

## Deploy from GHCR (production)

CI builds and pushes images to `ghcr.io/<owner>/vedy_bot:sha-<7>`. To deploy on any VM:

1. Create secrets file `~/.vedy_bot/env`:

```bash
mkdir -p ~/.vedy_bot
cat > ~/.vedy_bot/env << 'EOF'
TELEGRAM_INTAKE_TOKEN=your-bot-token
TELEGRAM_INTAKE_CHAT_IDS=-100...
TELEGRAM_OPERATOR_CHAT_IDS=-200...
INTAKE_CONSOLE_TOKEN=long-random-secret
INTAKE_CONSOLE=1
EOF
chmod 600 ~/.vedy_bot/env
```

2. Create `docker-compose.vedy_bot.yml`:

```yaml
name: vedy_bot
services:
  vedy_bot:
    image: ghcr.io/<owner>/vedy_bot:sha-XXXXXXX  # replace with actual digest
    container_name: vedy_bot
    env_file:
      - ${HOME}/.vedy_bot/env
    environment:
      INTAKE_HOME: /var/lib/vedy_bot
      INTAKE_CONSOLE_ADDR: "0.0.0.0:8787"
    ports:
      - "127.0.0.1:8787:8787"  # loopback only; use Caddy/nginx for HTTPS
    volumes:
      - ${HOME}/.vedy_bot:/var/lib/vedy_bot
    restart: unless-stopped
```

3. Pull and run:

```bash
docker compose -f docker-compose.vedy_bot.yml pull
docker compose -f docker-compose.vedy_bot.yml up -d
```

4. Verify:

```bash
curl -sS http://127.0.0.1:8787/health
curl -sS -H "Authorization: Bearer $INTAKE_CONSOLE_TOKEN" http://127.0.0.1:8787/api/thread
```

For HTTPS, put Caddy/nginx in front with reverse_proxy to `127.0.0.1:8787`. Do not expose port 8787 directly to the internet.

Generate a deploy snippet: `./scripts/print-deploy-compose.sh sha-abc1234`

## Frontend (Lovable Interface Refresh)

UI lives in `fe/` (synced from GitHub `lionss888/interface-refresh`, not `vdp/fe`).

```bash
make fe-sync   # rsync from GitHub; preserves fe/src/lib/api/
make fe-dev    # Vite :5174, proxies /api and /health → :8787
make fe-build  # Nitro node-server → fe/.output
make fe-test   # API mapper unit tests
```

`fe-sync` excludes `src/lib/api/`, local Vite/proxy config, `node_modules/`, `.git/`, env files, and build outputs — do not put live API wiring only in Lovable cloud.

Dev: start vedy_bot on :8787, then `make fe-dev`. Prod/Docker: SPA on the same :8787 origin.

Optional demo mocks: `VITE_INTAKE_DEMO=1` (default is live Go API).

## Console capabilities

- Live thread from `thread/` JSONL (in + out mirrors), not only inbox; filter manager/operator
- HITL cards approve/decline; optional agent analyze/ask
- Send text (as vedy_bot and/or mirror to Telegram)
- Upload image/video/code files
- Cursor-grade `.plan.md` under `.cursor/plans/тгбот/` (frontmatter + todos) via API/UI
- Selective publish of selected text to manager or operator chat (sanitize)
- Delete a Telegram message by id
- Manager-safe "done" template (`comms.ManagerDone`) mirrored to the chat
- Header shows console Bearer vs agent key (`crsr_…`, legacy `key_…`) separately

## Analytics boundary

In-process package `internal/analytics` only — **not** a docker/HTTP analytics service and not an external LLM.

Public DTO: `analytics.Bundle` (alias `Result`) with `class`, `confidence`, `summary`, `conflicts`, `estimate`.
Pipeline writes one contract (`Run` → card.`Analytics`, inbox via `ToInbox`, planfile via `DocumentFromAnalytics` / `ToPlan`).
Console `GET /api/cards` returns card JSON including the `analytics` object.

## Tests

`make test` or `go test ./cmd/... ./internal/...`  
`make fe-test` / `make fe-build` for the SPA layer.  
`make smoke` — local Nitro + Go on :8791 (avoids Docker :8787): SPA HTML + `/api/thread` 401/200.

## Trigger matrix

Канон в коде: `normalize.RouteOf` / `CreatesHITLCard` (см. `internal/normalize/route.go`).
`/help` в чате повторяет ту же матрицу менеджеру.

| Вход | Лента (thread) | Inbox / HITL |
|---|---|---|
| `@бот` или `/vvod` (+ текст и/или медиа) | да | да (HITL при `-hitl`) |
| Сообщение/медиа без триггера | да | нет |
| `/help` | да (справка) | нет |
| Стикеры / голосовые | нет | нет |

## Honesty gaps

- Agent analyze/ask without CURSOR_API_KEY (or SDK failure) returns `status=error` — never `done` with a local stub as success.
- Mode `local_analyze` is the only intentional rule-based stub for offline/unit.
- RAG claim requires cloud embeddings (`INTAKE_EMBEDDING_*`); without API key ingest/search fail explicitly (no silent keyword-only «успех»).
- TG auto Cursor (`INTAKE_TG_CURSOR=1`) needs key + bridge; otherwise hybrid falls back to rules or cursor-only tells manager that ops will handle.
- Stand start is operator console / operator TG only; manager sees sanitized status text without commands/paths.
- Lovable preview alone is not the live console until `fe/src/lib/api` is wired and vedy_bot is running — preview mocks ≠ production thread.
- Embed vanilla UI under `internal/console/ui/` is fallback only when SPA upstream/static is absent.
- Stickers/voice are not ingested (вне AP0 scope; не попадают в inbox).
- Media without intake trigger (`@bot` / `/vvod`) is mirrored into the thread only — it does not create an inbox HITL card.
- Bot API does not return history from before the poller started; the console is a live mirror from process start.
- Console is operator-only (bearer token on loopback), not a VED cabinet; second TG operator chat is optional (`TELEGRAM_OPERATOR_CHAT_IDS`) — console remains the mirror.
- Plans are Cursor frontmatter/todos parity, not full CreatePlan MCP / auto-run from TG.
- Not full parity of all Telegram update types.
- Do not claim full Lovable-preview ↔ prod parity without smoke: SPA HTML from :8787 and `GET /api/thread` with token.
- Rule-HITL packages remain as fallback (P3 hybrid); not hard-deleted.
