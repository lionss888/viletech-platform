# Document extraction (dual-track)

Side-path only: speeds operator data entry. Never auto-approves compliance or auto-pays.
Manual entry always remains. Status machine stays in core; extraction is a plugin behind hub OCR_URL.

## Architecture

PRIMARY (client-visible prefill). Yandex Vision OCR plus AI Studio, or fixture without keys, or own after eval gate.

SHADOW. Docling HTTP when EXTRACTION_SHADOW_URL is set; otherwise deterministic stub. Not shown in UI.

HITL. Operator edits line items and confirms; hard labels live in human_out.

Gold. JSONL under EXTRACTION_GOLD_DIR on the extraction service volume (not the payment DB).

Own. Offline train from gold to artifact to OwnAdapter; canary via EXTRACTION_PRIMARY equals own with EXTRACTION_FALLBACK equals yandex.

## Schema v1

ExtractionResult fields: schema_version, doc_type, language, confidence, header, line_items, meta, warnings.

GoldRecord fields: gold_id, form_payment_id, organization_id, primary_out, shadow_out, human_out, engines, timestamps.

## Env

Variable OCR_URL. Role hub calls extraction POST recognize.

Variable EXTRACTION_PRIMARY. Values yandex, fixture, or own.

Variable EXTRACTION_FALLBACK. Value fixture for commercial wire, or yandex when own is primary.

Variable EXTRACTION_SHADOW_URL. Docling HTTP; empty means stub.

Variable EXTRACTION_GOLD_DIR. JSONL gold store.

Variables YANDEX_API_KEY, YANDEX_FOLDER_ID, YANDEX_MODEL_URI. Role PRIMARY yandex. Store only in gitignored env, never commit.

Variable OWN_MODEL_PATH. Artifact dir for own.

Secrets: copy env.example to env. Rotate any key that appeared outside the secret store. Smoke: make extraction-yandex-smoke.

## Flywheel

Recognize produces primary plus shadow and appends GoldRecord with human empty.

Operator confirm sends core S2S POST gold human and upserts human_out.

After at least 100 confirmed docs with line items: make extraction-export-gold, then train job, then eval F1, then canary own.

Hard label is human_out only. Primary output is soft teacher.

## Eval gate (own prod)

Do not set prod EXTRACTION_PRIMARY to own until held-out eval report exists with header and line-item F1 recorded. Own is partial or stub until then (честность-готовности).

## Formats

pdf, txt, docx, xlsx via format router in vdp/extraction.

## Applied tooling matrix (what to take / skip)

Source Hugging Face. Applied role Hub plus Transformers / PEFT / TRL for Wave E LoRA on Qwen; optional private dataset for export gold. Inference Endpoints equal vendor API again, not own. Decision: use for train and tooling only. Runtime serve on CPU equals Ollama (separate plan), not HF Endpoints as PRIMARY.

Source YaLM 100B (Yandex OSS, 2022). Applied role large bilingual OSS; 100B impractical on CPU pilot; outdated vs Qwen2.5 / YandexGPT API for IE. Decision: skip self-host in dual-track.

Source Onyx. Applied role open-source chat/RAG over connectors — not invoice IE, not hub OCR replacement. Decision: skip for extraction. Possible later RFC for help/RAG support only (non-payment path).

Source open-llms. Applied role commercial-use license checklist for open LLMs. Decision: license gate before Wave E base model choice — see extraction/train/lora_recipe.md.

Commercial path now: Yandex API PRIMARY behind hub. Own substitution: gold to LoRA (HF tooling) to eval to canary; never auto-pay.
