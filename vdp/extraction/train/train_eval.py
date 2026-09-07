#!/usr/bin/env python3
"""Offline train/eval scaffold for extraction own model (side-path only).

Reads export JSONL (human_out hard labels), writes artifacts/{model_version}/
with metrics.json. Real fine-tune is a placeholder: copies label stats.
Never runs on payment commit path.
"""
from __future__ import annotations

import argparse
import json
import sys
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


def eval_split(rows: list[dict]) -> dict:
    if not rows:
        return {"n": 0, "header_f1_proxy": 0.0, "line_item_f1_proxy": 0.0}
    header_hits = 0
    header_total = 0
    line_hits = 0
    line_total = 0
    for rec in rows:
        human = rec.get("human_out") or {}
        primary = rec.get("primary_out") or {}
        hh = human.get("header") or {}
        ph = primary.get("header") or {}
        for key in ("invoice_amount", "currency", "contract_number", "invoice_number"):
            header_total += 1
            if header_exact(hh, ph, key):
                header_hits += 1
        h_lines = human.get("line_items") or []
        p_lines = primary.get("line_items") or []
        for i, hl in enumerate(h_lines):
            line_total += 1
            if i < len(p_lines):
                pl = p_lines[i]
                if (hl.get("description") or "") == (pl.get("description") or "") and (
                    hl.get("line_amount") or ""
                ) == (pl.get("line_amount") or ""):
                    line_hits += 1
    return {
        "n": len(rows),
        "header_f1_proxy": (header_hits / header_total) if header_total else 0.0,
        "line_item_f1_proxy": (line_hits / line_total) if line_total else 0.0,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--export-dir", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--model-version", default="own-baseline-0")
    args = ap.parse_args()
    export_dir = Path(args.export_dir)
    train = load_jsonl(export_dir / "train.jsonl")
    test = load_jsonl(export_dir / "test.jsonl")
    metrics = {
        "model_version": args.model_version,
        "schema_version": "v1",
        "train_rows": len(train),
        "test_eval": eval_split(test),
        "train_eval_vs_primary": eval_split(train),
        "ready_for_prod_primary": False,
        "ollama_model": "qwen2.5:3b",
        "note": "Set ready_for_prod_primary true only after human review of F1 vs thresholds in extraction.md",
    }
    out = Path(args.out_dir) / args.model_version
    out.mkdir(parents=True, exist_ok=True)
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    adapter = {
        "base_model": "Qwen/Qwen2.5-3B-Instruct",
        "ollama_model": "qwen2.5:3b",
        "lora_r": 16,
        "schema_version": "v1",
        "status": "smoke_placeholder",
    }
    (out / "adapter_config.json").write_text(json.dumps(adapter, indent=2), encoding="utf-8")
    (out / "README.txt").write_text(
        "Placeholder artifact. Wave E GPU LoRA → Modelfile; see lora_recipe.md\n",
        encoding="utf-8",
    )
    print(json.dumps(metrics, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
