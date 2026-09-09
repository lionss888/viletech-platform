#!/usr/bin/env python3
"""Batch POST /recognize for corpus PDFs (Yandex PRIMARY). Supports resume."""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None  # type: ignore

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CORPUS = ROOT / "вводные" / "примеры документов"
FOLDERS = ("Инвойсы", "Контракты")
EXTRACT_ROOT = Path(__file__).resolve().parents[1] / "extraction"


def file_id(folder: str, name: str) -> str:
    stem = Path(name).stem
    raw = f"corpus-{folder}-{stem}"
    return raw[:100]


def pages_and_size(path: Path) -> tuple[int, int, bool]:
    size = path.stat().st_size
    pages = 0
    if PdfReader is not None:
        try:
            pages = len(PdfReader(str(path), strict=False).pages)
        except Exception:  # noqa: BLE001
            pages = 0
    risk = size > 8 * 1024 * 1024 or pages > 15
    return pages, size, risk


def load_done(jsonl: Path) -> set[str]:
    done: set[str] = set()
    if not jsonl.is_file():
        return done
    with jsonl.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            fid = obj.get("id") or obj.get("form_payment_id")
            if fid and obj.get("http_ok") is not False:
                # resume: skip successful or completed attempts that returned JSON
                if obj.get("completed"):
                    done.add(fid)
    return done


def extract_fields(resp: dict) -> dict:
    fields = resp.get("fields") or {}
    invoice_json = fields.get("invoice_json") or ""
    parsed: dict = {}
    if isinstance(invoice_json, str) and invoice_json.strip().startswith("{"):
        try:
            parsed = json.loads(invoice_json)
        except json.JSONDecodeError:
            parsed = {}
    header = parsed.get("header") or {}
    return {
        "mode": resp.get("mode"),
        "ml": resp.get("ml"),
        "status": resp.get("status"),
        "invoice_amount": fields.get("invoice_amount") or header.get("invoice_amount") or "",
        "currency": fields.get("currency") or header.get("currency") or "",
        "invoice_number": header.get("invoice_number") or "",
        "invoice_date": header.get("invoice_date") or "",
        "company_name": header.get("company_name") or "",
        "contract_number": fields.get("contract_number") or header.get("contract_number") or "",
        "doc_type": parsed.get("doc_type") or "",
        "warnings": parsed.get("warnings") or [],
        "invoice_json_len": len(invoice_json) if isinstance(invoice_json, str) else 0,
        "yandex_ok": "yandex" in str(resp.get("mode") or ""),
        "empty_amount": not str(fields.get("invoice_amount") or header.get("invoice_amount") or "").strip(),
        "empty_currency": not str(fields.get("currency") or header.get("currency") or "").strip(),
    }


def post_recognize(base: str, body: dict, timeout: float) -> tuple[int, dict, str]:
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{base.rstrip('/')}/recognize",
        data=data,
        headers={"content-type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8", errors="replace")
            try:
                return res.status, json.loads(raw), ""
            except json.JSONDecodeError:
                return res.status, {}, raw[:500]
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(raw), ""
        except json.JSONDecodeError:
            return exc.code, {}, raw[:500]
    except Exception as exc:  # noqa: BLE001
        return 0, {}, str(exc)[:500]


def iter_pdfs(corpus: Path) -> list[Path]:
    out: list[Path] = []
    for folder in FOLDERS:
        d = corpus / folder
        if not d.is_dir():
            continue
        seen: set[str] = set()
        for p in sorted(list(d.glob("*.pdf")) + list(d.glob("*.PDF"))):
            key = p.name.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(p)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    parser.add_argument("--base-url", default=os.environ.get("EXTRACTION_SMOKE_URL", "http://127.0.0.1:8093"))
    parser.add_argument("--out-dir", type=Path, default=None)
    parser.add_argument("--throttle", type=float, default=1.5)
    parser.add_argument("--timeout", type=float, default=120.0)
    parser.add_argument("--limit", type=int, default=0, help="0 = all")
    args = parser.parse_args()

    key = os.environ.get("YANDEX_API_KEY", "").strip()
    folder = os.environ.get("YANDEX_FOLDER_ID", "").strip()
    primary = os.environ.get("EXTRACTION_PRIMARY", "").strip()

    if not key or not folder:
        print("FAIL: YANDEX_API_KEY and/or YANDEX_FOLDER_ID unset — refuse fixture recognize", file=sys.stderr)
        return 2
    if primary and primary != "yandex":
        print(f"WARN: EXTRACTION_PRIMARY={primary} (expected yandex)", file=sys.stderr)

    # health
    try:
        with urllib.request.urlopen(f"{args.base_url.rstrip('/')}/health", timeout=10) as res:
            health = json.loads(res.read().decode())
    except Exception as exc:  # noqa: BLE001
        print(f"FAIL: extraction health: {exc}", file=sys.stderr)
        return 2
    if health.get("primary") != "yandex":
        print(f"FAIL: extraction primary={health.get('primary')} want yandex", file=sys.stderr)
        return 2

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = args.out_dir or (EXTRACT_ROOT / ".corpus-runs" / run_id)
    out_dir.mkdir(parents=True, exist_ok=True)
    jsonl_path = out_dir / "recognize.jsonl"
    done = load_done(jsonl_path)

    pdfs = iter_pdfs(args.corpus)
    if args.limit > 0:
        pdfs = pdfs[: args.limit]

    stats = {
        "n": 0,
        "skipped_resume": 0,
        "http_ok": 0,
        "yandex_ok": 0,
        "fixture_or_other": 0,
        "empty_amount": 0,
        "empty_currency": 0,
        "errors": 0,
        "risk_large": 0,
    }

    with jsonl_path.open("a", encoding="utf-8") as fh:
        for path in pdfs:
            fid = file_id(path.parent.name, path.name)
            stats["n"] += 1
            if fid in done:
                stats["skipped_resume"] += 1
                continue
            pages, size, risk = pages_and_size(path)
            if risk:
                stats["risk_large"] += 1
            content_b64 = base64.b64encode(path.read_bytes()).decode("ascii")
            body = {
                "form_payment_id": fid,
                "event_id": f"{fid}-ev",
                "payload": {
                    "file_name": path.name,
                    "mime": "application/pdf",
                    "content_base64": content_b64,
                },
            }
            code, resp, err = post_recognize(args.base_url, body, args.timeout)
            row: dict = {
                "id": fid,
                "folder": path.parent.name,
                "file_name": path.name,
                "pages": pages,
                "size_bytes": size,
                "risk_large": risk,
                "http_status": code,
                "http_ok": 200 <= code < 300,
                "completed": True,
                "error": err,
                "ts": datetime.now(timezone.utc).isoformat(),
            }
            if resp:
                fields = extract_fields(resp)
                row.update(fields)
                # keep compact raw without huge invoice_json duplication beyond len
                row["raw_mode"] = resp.get("mode")
                row["raw_status"] = resp.get("status")
            if row.get("http_ok"):
                stats["http_ok"] += 1
            else:
                stats["errors"] += 1
            if row.get("yandex_ok"):
                stats["yandex_ok"] += 1
            elif row.get("http_ok"):
                stats["fixture_or_other"] += 1
            if row.get("empty_amount"):
                stats["empty_amount"] += 1
            if row.get("empty_currency"):
                stats["empty_currency"] += 1
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
            fh.flush()
            print(
                f"[{stats['n']}/{len(pdfs)}] {path.parent.name}/{path.name[:40]} "
                f"http={code} mode={row.get('mode')} amount_empty={row.get('empty_amount')}",
                flush=True,
            )
            time.sleep(args.throttle)

    summary = {
        "run_id": out_dir.name,
        "base_url": args.base_url,
        "corpus": str(args.corpus),
        "recognize_jsonl": str(jsonl_path),
        "stats": stats,
    }
    (out_dir / "recognize-summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if stats["yandex_ok"] == 0 and stats["n"] > stats["skipped_resume"]:
        print("FAIL: zero yandex_ok responses", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
