# Document extraction (dual-track)

Side-path only: speeds operator data entry. Never auto-approves compliance or auto-pays.
Manual entry always remains. Status machine stays in core; extraction is a plugin behind hub OCR_URL.

## Architecture

PRIMARY (client-visible prefill): Yandex Vision OCR plus AI Studio, or fixture without keys, or own (Ollama) for dev/canary after wiring.

SHADOW: Docling HTTP when EXTRACTION_SHADOW_URL is set; otherwise deterministic stub. Not shown in UI.

HITL: operator edits line items and confirms; hard labels live in human_out.

Gold: JSONL under EXTRACTION_GOLD_DIR (includes layout_text for SFT).

Own: CPU = Ollama Qwen2.5-3B plus few-shot from gold; weights = Wave E LoRA (see train/lora_recipe.md). Prod PRIMARY equals own only after held-out eval.

## Schema v1

ExtractionResult: schema_version, doc_type, language, confidence, header, line_items, meta, warnings.

GoldRecord: gold_id, form_payment_id, organization_id, primary_out, shadow_out, human_out, layout_text, engines, timestamps.

## Env

OCR_URL — hub to extraction POST /recognize.

EXTRACTION_PRIMARY — yandex | fixture | own.

EXTRACTION_FALLBACK — fixture (commercial wire) or yandex when own is primary.

EXTRACTION_SHADOW_URL — Docling HTTP; empty means stub.

EXTRACTION_GOLD_DIR — JSONL gold store.

YANDEX_API_KEY / YANDEX_FOLDER_ID / YANDEX_MODEL_URI — PRIMARY yandex (gitignored .env only).

OLLAMA_BASE_URL / OLLAMA_MODEL / OWN_FEW_SHOT_K — own via host Ollama (default model qwen2.5:3b).

OWN_MODEL_PATH — artifact dir (metrics.json may set ollama_model tag).

Secrets: copy .env.example to .env. Rotate leaked keys. Smoke: make extraction-yandex-smoke. Own ensure: make extraction-ollama-ensure (pull once if missing).

## Model cache (no re-download on rebuild)

Weights live in host Ollama store or compose volume ollama_models (profile own only).

extraction Dockerfile never runs ollama pull. go test uses httptest mocks only.

Cold start (RAM load) is not a network download.

## Flywheel

Recognize → primary + shadow → GoldRecord (human empty, layout_text set).

Confirm → S2S POST /gold/human → human_out.

After ≥100 confirms: make extraction-export-gold → train/eval → canary own.

Hard label = human_out only.

## Eval gate (own prod)

Do not set prod EXTRACTION_PRIMARY to own until held-out eval and ready_for_prod_primary. CPU eval (make extraction-eval-own) always keeps ready_for_prod_primary false.

## Formats

pdf, txt, docx, xlsx via format router in vdp/extraction.

## Applied tooling matrix

Hugging Face — train/tooling (PEFT/TRL) for Wave E; not PRIMARY runtime.

YaLM 100B — skip self-host.

Onyx — skip for extraction.

open-llms — license gate before Wave E; see train/lora_recipe.md.

Commercial path: Yandex API PRIMARY. Own: gold → few-shot (CPU) → LoRA (GPU Wave E) → eval → canary; never auto-pay.
