# Extraction / Yandex keys runbook

Side-path only. Manual entry always available. Do not enable `EXTRACTION_PRIMARY=own` in production until held-out eval report exists.

## Yandex Cloud

1. Open folder (AI Studio / Cloud console).
2. Create service account with Vision OCR + Foundation Models execute scopes.
3. Create API key; store as `YANDEX_API_KEY` (never commit).
4. Set `YANDEX_FOLDER_ID` to the folder id.
5. Set `YANDEX_MODEL_URI` (e.g. `gpt://<folder>/yandexgpt-lite` or vision-capable model URI from AI Studio).
6. Compose / staging: `EXTRACTION_PRIMARY=yandex`, hub `OCR_URL=http://extraction:8093/recognize`, core `EXTRACTION_URL=http://extraction:8093`.

## Smoke

Without keys:

```sh
curl -s localhost:8093/health
curl -s -X POST localhost:8093/recognize -H 'content-type: application/json' \
  -d '{"form_payment_id":"f1","event_id":"e1","payload":{"file_name":"a.txt","text":"invoice"}}'
```

Expect `mode=fixture` and `fields.invoice_json` schema v1 with `line_items`.

With keys: same with `EXTRACTION_PRIMARY=yandex`; expect `mode=yandex` or fallback.

HITL: `POST /api/v1/forms/{id}/extraction/confirm` with JWT (not provider).

## Own path

1. Accumulate ≥100 confirms → `make extraction-export-gold`
2. `python extraction/train/train_eval.py --export-dir ... --out-dir artifacts`
3. Review `metrics.json`; only then staging canary `EXTRACTION_PRIMARY=own` + `OWN_MODEL_PATH` + `EXTRACTION_FALLBACK=yandex`.
