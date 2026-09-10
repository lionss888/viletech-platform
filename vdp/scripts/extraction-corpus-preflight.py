#!/usr/bin/env python3
"""Layout preflight for invoice/contract PDF corpus (no cloud calls)."""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("FAIL: pypdf required (pip install pypdf)", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CORPUS = ROOT / "вводные" / "примеры документов"
FOLDERS = ("Инвойсы", "Контракты")


def classify_name(name: str) -> str:
    n = name.lower()
    if "packing" in n or "shipping" in n or "specification" in n:
        return "bundle"
    if "proforma" in n or n.startswith("pi-") or ".pi." in n or " pi " in f" {n} ":
        return "proforma"
    if "quotation" in n or "quote" in n:
        return "quotation"
    if "po-" in n or "order" in n and "invoice" not in n:
        return "po"
    if "contract" in n or "контракт" in n or n.startswith("дог") or " дог" in f" {n}":
        return "contract"
    if "invoice" in n or "инво" in n or "инв_" in n or "счет" in n or "счёт" in n:
        return "invoice"
    return "other"


def analyze_pdf(path: Path, corpus_root: Path) -> dict:
    try:
        rel = str(path.relative_to(corpus_root))
    except ValueError:
        rel = path.name
    row: dict = {
        "id": f"corpus-{path.parent.name}-{path.stem}"[:120],
        "folder": path.parent.name,
        "file_name": path.name,
        "rel_path": rel,
        "size_bytes": path.stat().st_size,
        "tag": classify_name(path.name),
        "pages": 0,
        "text_chars": 0,
        "likely_scan": True,
        "error": "",
    }
    try:
        reader = PdfReader(str(path), strict=False)
        row["pages"] = len(reader.pages)
        texts: list[str] = []
        for page in reader.pages[:5]:
            try:
                texts.append(page.extract_text() or "")
            except Exception as exc:  # noqa: BLE001
                texts.append("")
                row["error"] = f"page_extract:{exc}"[:200]
        full = "\n".join(texts)
        row["text_chars"] = len(full.strip())
        row["likely_scan"] = row["text_chars"] < 80
        row["risk_large"] = row["size_bytes"] > 8 * 1024 * 1024 or row["pages"] > 15
        cyr = len(re.findall(r"[А-Яа-яЁё]", full))
        lat = len(re.findall(r"[A-Za-z]", full))
        han = len(re.findall(r"[\u4e00-\u9fff]", full))
        row["script"] = {"cyr": cyr, "lat": lat, "han": han}
    except Exception as exc:  # noqa: BLE001
        row["error"] = str(exc)[:300]
        row["likely_scan"] = True
        row["risk_large"] = row["size_bytes"] > 8 * 1024 * 1024
    return row


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=DEFAULT_CORPUS,
        help="Root with Инвойсы/ and Контракты/",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Output dir (default extraction/.corpus-runs/<run_id>)",
    )
    args = parser.parse_args()
    corpus: Path = args.corpus
    if not corpus.is_dir():
        print(f"FAIL: corpus not found: {corpus}", file=sys.stderr)
        return 1

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir: Path = args.out_dir or (Path(__file__).resolve().parents[1] / "extraction" / ".corpus-runs" / run_id)
    out_dir.mkdir(parents=True, exist_ok=True)

    rows: list[dict] = []
    for folder in FOLDERS:
        d = corpus / folder
        if not d.is_dir():
            print(f"WARN: missing folder {d}", file=sys.stderr)
            continue
        pdfs = sorted(d.glob("*.pdf")) + sorted(d.glob("*.PDF"))
        # de-dup case-insensitive
        seen: set[str] = set()
        for p in pdfs:
            key = p.name.lower()
            if key in seen:
                continue
            seen.add(key)
            rows.append(analyze_pdf(p, corpus))

    out_jsonl = out_dir / "preflight.jsonl"
    with out_jsonl.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    by_folder: dict[str, Counter] = {}
    for row in rows:
        c = by_folder.setdefault(row["folder"], Counter())
        c["n"] += 1
        if row["likely_scan"]:
            c["scan"] += 1
        else:
            c["text"] += 1
        if row.get("risk_large"):
            c["risk_large"] += 1
        if row.get("error"):
            c["error"] += 1
        c[f"tag_{row['tag']}"] += 1

    summary = {
        "run_id": run_id,
        "corpus": str(corpus),
        "total": len(rows),
        "by_folder": {k: dict(v) for k, v in by_folder.items()},
        "preflight_jsonl": str(out_jsonl),
    }
    summary_path = out_dir / "preflight-summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (out_dir / "run_id.txt").write_text(run_id + "\n", encoding="utf-8")

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"preflight_ok out_dir={out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
