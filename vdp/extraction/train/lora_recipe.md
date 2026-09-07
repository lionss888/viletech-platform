# LoRA / own-model recipe (Wave E — GPU)

Offline only. Never on payment commit HTTP path. Hard labels = `human_out` from HITL gold.

## License gate (before train)

1. Pick base model with **commercial-ok** license (see [open-llms](https://github.com/eugeneyan/open-llms)).
2. Prefer Qwen2.5 Instruct family for RU/multilingual invoices (Ollama CPU pilot uses `qwen2.5:3b`; GPU train default **7B**).
3. Record license + model id in `artifacts/{model_version}/adapter_config.json`.
4. Do **not** train on YaLM 100B self-host for this product path (ops cost; use Yandex API + Qwen instead).
5. Hugging Face = download + PEFT/TRL/Unsloth tooling; do not set HF Inference Endpoints as prod PRIMARY “own”.

## Inputs

- `make extraction-export-gold` → `train.jsonl` / `test.jsonl` / `manifest.json`
- Each row: layout text + `human_out` (ExtractionResult v1)

## Train (GPU machine)

```text
export → SFT/LoRA (Unsloth or HF PEFT+TRL)
  → artifacts/{model_version}/
       metrics.json
       adapter_config.json
       README
```

Set `ready_for_prod_primary: true` in metrics **only** after held-out F1 review.

## Serve

Ollama Modelfile / tag `vdp-extract-{version}` on volume — not baked into `extraction` image.
`EXTRACTION_PRIMARY=own` + `EXTRACTION_FALLBACK=yandex` for canary.

## Out of scope here

- Onyx platform install
- Online fine-tune per request
- Auto-approve / auto-pay
