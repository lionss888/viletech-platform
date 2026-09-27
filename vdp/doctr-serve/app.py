"""Lightweight docTR-serve compatible OCR HTTP API for VDP extraction FALLBACK."""
from __future__ import annotations

import base64
import io
import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("doctr-serve")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="vdp-doctr-serve", version="1.0.0")

_predictor = None


class OcrRequest(BaseModel):
    base64_string: str = Field(..., min_length=1)
    filename: str = "document.bin"
    mime: str = ""


def _load_predictor() -> Any:
    global _predictor
    if _predictor is not None:
        return _predictor
    try:
        from doctr.models import ocr_predictor

        _predictor = ocr_predictor(pretrained=True)
        logger.info("doctr ocr_predictor loaded")
    except Exception as exc:  # noqa: BLE001 — optional heavy dep
        logger.warning("doctr predictor unavailable: %s", exc)
        _predictor = False
    return _predictor


def _text_from_pdf(data: bytes) -> str:
    try:
        import fitz  # pymupdf
    except ImportError:
        return ""
    parts: list[str] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for page in doc:
            parts.append(page.get_text("text") or "")
    return "\n".join(parts).strip()


def _ocr_images(images: list[Any]) -> str:
    predictor = _load_predictor()
    if not predictor:
        return ""
    from doctr.io import DocumentFile

    # DocumentFile.from_images expects paths or arrays; use PIL bytes via temp-like buffers.
    import numpy as np
    from PIL import Image

    arrays = []
    for img in images:
        if isinstance(img, Image.Image):
            arrays.append(np.array(img.convert("RGB")))
        else:
            arrays.append(img)
    if not arrays:
        return ""
    result = predictor(arrays)
    export = result.export()
    lines: list[str] = []
    for page in export.get("pages", []):
        for block in page.get("blocks", []):
            for line in block.get("lines", []):
                words = [w.get("value", "") for w in line.get("words", [])]
                text = " ".join(w for w in words if w).strip()
                if text:
                    lines.append(text)
    return "\n".join(lines).strip()


def _pdf_pages_as_images(data: bytes, max_pages: int = 3) -> list[Any]:
    try:
        import fitz
        from PIL import Image
    except ImportError:
        return []
    images = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for i, page in enumerate(doc):
            if i >= max_pages:
                break
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(img)
    return images


def _ocr_bytes(data: bytes, filename: str, mime: str) -> str:
    lower = (filename or "").lower()
    mime_l = (mime or "").lower()
    if mime_l.startswith("text/") or lower.endswith(".txt"):
        return data.decode("utf-8", errors="replace").strip()

    if mime_l == "application/pdf" or lower.endswith(".pdf"):
        text = _text_from_pdf(data)
        if len(text) >= 40:
            return text
        images = _pdf_pages_as_images(data)
        ocr = _ocr_images(images)
        return ocr or text

    try:
        from PIL import Image

        img = Image.open(io.BytesIO(data))
        return _ocr_images([img])
    except Exception as exc:  # noqa: BLE001
        logger.warning("image ocr failed: %s", exc)
        return ""


@app.get("/health")
def health() -> dict[str, Any]:
    pred = _load_predictor()
    return {
        "status": "ok",
        "engine": "doctr",
        "predictor": bool(pred),
    }


@app.post("/v1/ocr")
def ocr(req: OcrRequest) -> dict[str, str]:
    try:
        raw = base64.b64decode(req.base64_string)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"invalid base64: {exc}") from exc
    if not raw:
        raise HTTPException(status_code=400, detail="empty content")
    text = _ocr_bytes(raw, req.filename, req.mime)
    if not text.strip():
        raise HTTPException(status_code=422, detail="no text extracted")
    return {"text": text}
