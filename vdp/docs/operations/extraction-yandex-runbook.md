# Extraction runbook (Yandex + Ollama own)

Side-path only. Manual entry always available. Do not enable EXTRACTION_PRIMARY equals own in production until held-out eval report exists.

## Secrets

Copy vdp/.env.example to vdp/.env (gitignored). Never commit keys. Rotate any key shared outside the secret store.

## Yandex Cloud (PRIMARY commercial)

Open folder (AI Studio / Cloud console). Service account with Vision OCR + Foundation Models execute scopes. API key → YANDEX_API_KEY; folder → YANDEX_FOLDER_ID; model URI → YANDEX_MODEL_URI (e.g. gpt://folder/yandexgpt-lite). EXTRACTION_PRIMARY=yandex, EXTRACTION_FALLBACK=fixture. docker compose up -d extraction; make extraction-yandex-smoke.

## Ollama own (CPU dev/canary)

Prefer Ollama on the host so rebuilds never re-download weights.

Install Ollama; once: make extraction-ollama-ensure (pulls qwen2.5:3b only if missing). .env: EXTRACTION_PRIMARY=own, EXTRACTION_FALLBACK=yandex or fixture, OLLAMA_BASE_URL=http://host.docker.internal:11434, OLLAMA_MODEL=qwen2.5:3b, OWN_FEW_SHOT_K=3. Restart extraction. Health shows ollama_configured true. Latency on CPU may be tens of seconds (cold start = RAM load, not pull). Optional compose profile: docker compose --profile own up -d ollama (volume ollama_models; no pull in entrypoint).

## Distinctions

Network pull: make extraction-ollama-ensure / ollama pull (rare, once per machine/model tag). Cold start: first request after Ollama restart loads weights into RAM. Inference latency: CPU generation time for recognize.

## Smoke

make extraction-yandex-smoke — fixture or yandex.

Own: POST /recognize with text payload; expect mode own and fields.invoice_json when Ollama is up; otherwise stub/fallback.

HITL: POST /api/v1/forms/{id}/extraction/confirm with JWT (not provider).

## Eval / export

make extraction-export-gold
make extraction-eval-own   # ready_for_prod_primary stays false on CPU
make extraction-train-eval # smoke artifact scaffold

Wave E (GPU weights): see extraction/train/lora_recipe.md.
