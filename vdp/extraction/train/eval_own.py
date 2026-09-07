#!/usr/bin/env python3
"""Eval own predictions vs human_out on held-out export (CPU pilot).

ready_for_prod_primary is always False on this path.
Never downloads models; optional live Ollama only when OLLAMA_BASE_URL is set.
CI: pass --predictions-jsonl built from fixtures (no network).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))
    return rows


def header_exact(a: dict, b: dict, key: str) -> bool:
    return (a.get(key) or "").strip() == (b.get(key) or "").strip()


def score(pred: dict, human: dict) -> tuple[int, int, int, int]:
    hh = (human or {}).get("header") or {}
    ph = (pred or {}).get("header") or {}
    header_hits = header_total = 0
    for key in ("invoice_amount", "currency", "contract_number", "invoice_number"):
        header_total += 1
        if header_exact(hh, ph, key):
            header_hits += 1
    h_lines = (human or {}).get("line_items") or []
    p_lines = (pred or {}).get("line_items") or []
    line_hits = line_total = 0
    for i, hl in enumerate(h_lines):
        line_total += 1
        if i < len(p_lines):
            pl = p_lines[i]
            if (hl.get("description") or "") == (pl.get("description") or "") and (
                hl.get("line_amount") or ""
            ) == (pl.get("line_amount") or ""):
                line_hits += 1
    return header_hits, header_total, line_hits, line_total


def eval_pairs(rows: list[dict]) -> dict:
    if not rows:
        return {"n": 0, "header_f1_proxy": 0.0, "line_item_f1_proxy": 0.0}
    hh = ht = lh = lt = 0
    for rec in rows:
        human = rec.get("human_out") or {}
        pred = rec.get("prediction") or rec.get("primary_out") or {}
        a, b, c, d = score(pred, human)
        hh += a
        ht += b
        lh += c
        lt += d
    return {
        "n": len(rows),
        "header_f1_proxy": (hh / ht) if ht else 0.0,
        "line_item_f1_proxy": (lh / lt) if lt else 0.0,
    }


def ollama_predict(base: str, model: str, layout: str) -> dict:
    body = {
        "model": model,
        "stream": False,
        "format": "json",
        "messages": [
            {
                "role": "user",
                "content": (
                    "Extract invoice JSON schema v1 with header and line_items. Document:\n"
                    + (layout or "")[:8000]
                ),
            }
        ],
    }
    req = urllib.request.Request(
        base.rstrip("/") + "/api/chat",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        raw = json.loads(res.read().decode("utf-8"))
    content = ((raw.get("message") or {}).get("content")) or raw.get("response") or "{}"
    start = content.find("{")
    end = content.rfind("}")
    if start >= 0 and end > start:
        content = content[start : end + 1]
    return json.loads(content)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--export-dir", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--model-version", default="own-cpu-eval-0")
    ap.add_argument("--predictions-jsonl", default="")
    ap.add_argument("--split", default="test", choices=("test", "train"))
    args = ap.parse_args()
    export_dir = Path(args.export_dir)
    rows = load_jsonl(export_dir / f"{args.split}.jsonl")
    if args.predictions_jsonl:
        preds = load_jsonl(Path(args.predictions_jsonl))
        by_id = {p.get("gold_id") or p.get("form_payment_id"): p for p in preds}
        for rec in rows:
            key = rec.get("gold_id") or rec.get("form_payment_id")
            if key in by_id:
                rec["prediction"] = by_id[key].get("prediction") or by_id[key].get("human_out")
    else:
        base = os.environ.get("OLLAMA_BASE_URL", "").strip()
        model = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")
        if base:
            for rec in rows:
                try:
                    rec["prediction"] = ollama_predict(base, model, rec.get("layout_text") or "")
                except Exception as exc:  # noqa: BLE001
                    rec["prediction"] = {}
                    rec["prediction_error"] = str(exc)
        else:
            # Offline CI: score primary_out vs human as baseline proxy.
            for rec in rows:
                rec["prediction"] = rec.get("primary_out") or {}

    metrics = {
        "model_version": args.model_version,
        "schema_version": "v1",
        "split": args.split,
        "test_eval": eval_pairs(rows),
        "ready_for_prod_primary": False,
        "note": "CPU/eval path: ready_for_prod_primary stays false until Wave E GPU accept",
        "ollama_model": os.environ.get("OLLAMA_MODEL", "qwen2.5:3b"),
        "base_model": "qwen2.5",
    }
    out = Path(args.out_dir) / args.model_version
    out.mkdir(parents=True, exist_ok=True)
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    adapter = {
        "base_model": "Qwen/Qwen2.5-3B-Instruct",
        "ollama_model": metrics["ollama_model"],
        "lora_r": 16,
        "schema_version": "v1",
        "created_at": "pending-gpu",
        "status": "cpu_eval_placeholder",
    }
    (out / "adapter_config.json").write_text(json.dumps(adapter, indent=2), encoding="utf-8")
    (out / "README").write_text(
        "CPU eval artifact. Wave E: LoRA train then Ollama Modelfile — see lora_recipe.md\n",
        encoding="utf-8",
    )
    pred_path = out / "predictions.jsonl"
    with pred_path.open("w", encoding="utf-8") as f:
        for rec in rows:
            f.write(json.dumps({"gold_id": rec.get("gold_id"), "form_payment_id": rec.get("form_payment_id"), "prediction": rec.get("prediction"), "human_out": rec.get("human_out")}, ensure_ascii=False) + "\n")
    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
