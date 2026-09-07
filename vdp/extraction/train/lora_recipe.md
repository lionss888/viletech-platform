# LoRA / own-model recipe (Wave E — GPU)

Offline only. Never on payment commit HTTP path. Hard labels = `human_out` from HITL gold.
CPU wave delivers Ollama base + few-shot; **this file is the contract for creating weight artifacts**.

## License gate (before train)

1. Pick base model with **commercial-ok** license (see [open-llms](https://github.com/eugeneyan/open-llms)).
2. Prefer Qwen2.5 Instruct family (CPU serve `qwen2.5:3b`; GPU train default **Qwen2.5-7B-Instruct**).
3. Record license + model id in `artifacts/{model_version}/adapter_config.json`.
4. Do **not** train on YaLM 100B self-host for this product path.
5. Hugging Face = download + PEFT/TRL/Unsloth tooling; not HF Inference Endpoints as PRIMARY “own”.

## Preconditions

- ≥100 confirmed docs with `line_items` (`human_out`)
- Fresh `make extraction-export-gold` (rows include `layout_text`)
- GPU machine / runner (not FaaS, not payment HTTP)

## Wave E steps (create own model weights)

1. **Export:** `make extraction-export-gold`
2. **Train job (Docker GPU):** Unsloth or HF PEFT+TRL — SFT `layout_text` → ExtractionResult JSON; base Qwen2.5-7B-Instruct (or 3B if VRAM limited).
3. **Artifact:** write `artifacts/{model_version}/metrics.json` + `adapter_config.json` + adapter weights; pin `ollama_model` tag name.
4. **Pack for Ollama:** Modelfile (`FROM qwen2.5:7b` + adapter) **or** merged GGUF; tag `vdp-extract-{version}` into host/volume Ollama store — **never** bake into `extraction` image; no `ollama pull` in Dockerfile.
5. **Eval:** `make extraction-eval-own` with `OLLAMA_MODEL=vdp-extract-…` on held-out test vs `human_out`; record F1.
6. **Accept:** human review sets `ready_for_prod_primary: true` only after thresholds in architecture/extraction.md.
7. **Canary:** staging `EXTRACTION_PRIMARY=own`, `OLLAMA_MODEL=vdp-extract-…`, `EXTRACTION_FALLBACK=yandex`; hub unchanged.
8. **Retrain:** new `model_version` (no silent overwrite).

## CPU path (already in product)

- Base: `qwen2.5:3b` via host Ollama + few-shot from gold
- `make extraction-ollama-ensure` once; `make extraction-eval-own` always leaves `ready_for_prod_primary: false`

## Out of scope here

- Onyx platform install
- Online fine-tune per request
- Auto-approve / auto-pay
