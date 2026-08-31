# B.2 Pilot decisions (defaults)

Recorded for wave 0. Override via workshop with customer.

| ID | Decision | Default |
|----|----------|---------|
| D1 | Diadoc on pilot | **Manual upload/download only**; SM/hub Diadoc branches remain for post-pilot |
| D2 | OCR invoice/contract | **Optional side-path**; manual entry mandatory; `recognize_complete` without vendor |
| D3 | Docs engine | **Variant A** — external `DOCS_URL`; reference impl: `docs-service/` in repo |
| D4 | Report per N orders | **Open** — workshop (extension §3.7); payload supports single report per form until decided |
| D5 | RUB / actual amount formulas | **Open** — workshop; payload sends raw `rate_value`, `invoice_amount`, `actual_payment_amount` |

## D3 rationale

Variant A keeps PDF rendering outside core/hub (port + adapter). `docs-service` is a minimal staging reference, not production legal templates.

Hybrid (Nest port behind same URL) remains possible without changing hub contract.
