# Document extraction (dual-track)

Side-path only: speeds operator data entry. Never auto-approves compliance or auto-pays.
Manual entry always remains. Status machine stays in core; extraction is a plugin behind hub `OCR_URL`.

## Architecture

- **PRIMARY** (client-visible prefill): Yandex Vision OCR + AI Studio, or `fixture` without keys, or `own` after eval gate.
- **SHADOW**: Docling HTTP when `EXTRACTION_SHADOW_URL` is set; otherwise deterministic stub. Not shown in UI.
- **HITL**: operator edits line items and confirms → hard labels (`human_out`).
- **Gold**: JSONL under `EXTRACTION_GOLD_DIR` on the extraction service volume (not the payment DB).
- **Own**: offline train from gold → artifact → `OwnAdapter`; canary via `EXTRACTION_PRIMARY=own` with `EXTRACTION_FALLBACK=yandex`.

## Schema v1

`ExtractionResult`: `schema_version`, `doc_type`, `language`, `confidence`, `header`, `line_items[]`, `meta`, `warnings`.

`GoldRecord`: `gold_id`, `form_payment_id`, `organization_id`, `primary_out`, `shadow_out`, `human_out`, engines, timestamps.

## Env

| Variable | Role |
|---|---|
| `OCR_URL` | Hub → extraction `POST /recognize` |
| `EXTRACTION_PRIMARY` | `yandex` \| `fixture` \| `own` |
| `EXTRACTION_FALLBACK` | `yandex` when own fails |
| `EXTRACTION_SHADOW_URL` | Docling HTTP; empty = stub |
| `EXTRACTION_GOLD_DIR` | JSONL gold store |
| `YANDEX_API_KEY` / `YANDEX_FOLDER_ID` / `YANDEX_MODEL_URI` | PRIMARY yandex |
| `OWN_MODEL_PATH` | Artifact dir for own |

## Flywheel

1. Recognize → primary + shadow → append GoldRecord (human empty).
2. Operator confirm → core S2S `POST /gold/human` → upsert `human_out`.
3. After **≥ 100** confirmed docs with line items: `make extraction-export-gold` → train job → eval F1 → canary own.
4. Hard label = `human_out` only. Primary output is soft teacher.

## Eval gate (own prod)

Do not set prod `EXTRACTION_PRIMARY=own` until held-out eval report exists with header and line-item F1 recorded. Own is partial/stub until then (`честность-готовности`).

## Formats

pdf, txt, docx, xlsx via format router in `vdp/extraction`.
