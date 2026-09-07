# Extraction / Yandex keys runbook

Side-path only. Manual entry always available. Do not enable EXTRACTION_PRIMARY equals own in production until held-out eval report exists.

## Yandex Cloud

Step 1. Open folder (AI Studio / Cloud console).

Step 2. Create service account with Vision OCR and Foundation Models execute scopes.

Step 3. Create API key; store as YANDEX_API_KEY (never commit).

Step 4. Set YANDEX_FOLDER_ID to the folder id.

Step 5. Set YANDEX_MODEL_URI (for example gpt://folder/yandexgpt-lite or a vision-capable model URI from AI Studio).

Step 6. Compose / staging: EXTRACTION_PRIMARY equals yandex; hub OCR_URL equals http://extraction:8093/recognize; core EXTRACTION_URL equals http://extraction:8093.

## Smoke

Without keys: curl health on localhost:8093, then POST recognize with JSON form_payment_id, event_id, and payload file_name plus text. Expect mode equals fixture and fields.invoice_json schema v1 with line_items.

With keys: same with EXTRACTION_PRIMARY equals yandex; expect mode equals yandex or fallback.

HITL: POST /api/v1/forms/{id}/extraction/confirm with JWT (not provider).

## Own path

Step 1. Accumulate at least 100 confirms, then make extraction-export-gold.

Step 2. Run python extraction/train/train_eval.py with export-dir and out-dir artifacts.

Step 3. Review metrics.json; only then staging canary EXTRACTION_PRIMARY equals own plus OWN_MODEL_PATH plus EXTRACTION_FALLBACK equals yandex.
