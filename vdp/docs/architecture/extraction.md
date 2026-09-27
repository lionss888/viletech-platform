# Document extraction (dual-track)

Side-path only: speeds operator data entry. Never auto-approves compliance or auto-pays.
Manual entry always remains. Status machine stays in core; extraction is a plugin behind hub OCR_URL.

## Architecture

PRIMARY (client-visible prefill): Docling serve (EXTRACTION_PRIMARY equals docling) on the current pilot. FALLBACK equals docTR HTTP sidecar (EXTRACTION_FALLBACK equals doctr). Yandex Vision plus AI Studio and fixture remain available for non-demo paths but are not the default compose runtime. Own (Ollama) is for dev/canary after wiring.

SHADOW: Docling HTTP when EXTRACTION_SHADOW_URL is set; otherwise deterministic stub. On the Docling PRIMARY pilot shadow stays stub (one engine). Not shown in UI.

HITL: operator edits line items and confirms; hard labels live in human_out. Wizard pending shows Stop not Start; Skip OCR continues recognition in background with optional manual fill.

Gold: JSONL under EXTRACTION_GOLD_DIR (includes layout_text for SFT).

Own: CPU equals Ollama Qwen2.5-3B plus few-shot from gold; weights equals Wave E LoRA (see train/lora_recipe.md). Prod PRIMARY equals own only after held-out eval.

## Schema v1

ExtractionResult: schema_version, doc_type, language, confidence, header, line_items, meta, warnings.

GoldRecord: gold_id, form_payment_id, organization_id, primary_out, shadow_out, human_out, layout_text, engines, timestamps.

## Env

OCR_URL — hub to extraction POST /recognize.

OCR_TIMEOUT_MS — hub OCR plugin timeout (default 180000). Other adapters keep EXTERNAL_TIMEOUT_MS.

GATEWAY_TIMEOUT — core HubPublisher HTTP timeout in seconds (compose default 180). Inbox OCR is synchronous; keep GATEWAY_TIMEOUT at least OCR_TIMEOUT_MS divided by 1000 or the request cancels early (~15s code default without compose).

FE wizard poll uses OCR_POLL_TIMEOUT_MS equals 225000 so a late degraded callback after hub timeout can still populate HITL. Do not set FE poll equal to or below hub OCR_TIMEOUT_MS.

Docling PRIMARY HTTP client timeout is 90s. docTR FALLBACK HTTP client timeout is 70s. Together they fit under hub OCR_TIMEOUT_MS / GATEWAY_TIMEOUT of 180s. Unhealthy Docling skips straight to docTR. Total primary plus fallback failure returns degraded schema for HITL, not silent fixture money.

EXTRACTION_PRIMARY — docling | doctr | yandex | fixture | own. Pilot default equals docling.

EXTRACTION_FALLBACK — doctr on demo compose. Optional yandex or fixture for non-demo paths only.

EXTRACTION_DOCLING_URL — docling-serve base (compose: http://docling:5001).

EXTRACTION_DOCTR_URL — doctr-serve base (compose: http://doctr:5002).

EXTRACTION_SHADOW_URL — Docling HTTP for shadow; empty means stub.

EXTRACTION_GOLD_DIR — JSONL gold store.

YANDEX_API_KEY / YANDEX_FOLDER_ID / YANDEX_MODEL_URI — PRIMARY yandex (gitignored .env only). Not used as PRIMARY on the Docling pilot.

OLLAMA_BASE_URL / OLLAMA_MODEL / OWN_FEW_SHOT_K — own via host Ollama (default model qwen2.5:3b).

OWN_MODEL_PATH — artifact dir (metrics.json may set ollama_model tag).

Secrets: copy .env.example to .env. Rotate leaked keys. Smoke: make extraction-docling-smoke and make extraction-doctr-smoke. Own ensure: make extraction-ollama-ensure (pull once if missing).

Docling and docTR map text to header fields with shared MapInvoiceText heuristics; empty fields are normal and HITL fills them. meta.engine_id equals docling or doctr. Missing TN VED codes from OCR can be ensured via POST /api/v1/hs-codes/ensure (user on own form, manager, root) then substituted in the catalog pick.

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
