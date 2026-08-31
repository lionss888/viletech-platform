# B.2 Pilot decisions (defaults)

Recorded for wave 0. Override via workshop with customer.

## Decisions

ID D1. Decision Diadoc on pilot. Default manual upload and download only; SM and hub Diadoc branches remain for post-pilot.

ID D2. Decision OCR invoice and contract. Default optional side-path; manual entry mandatory; recognize_complete without vendor.

ID D3. Decision docs engine. Default Variant A, external DOCS_URL; reference implementation is docs-service/ in repo.

ID D4. Decision report per N orders. Default open, resolved at workshop (extension §3.7); payload supports single report per form until decided.

ID D5. Decision RUB and actual amount formulas. Default open, resolved at workshop; payload sends raw rate_value, invoice_amount and actual_payment_amount.

## D3 rationale

Variant A keeps PDF rendering outside core and hub (port plus adapter). The docs-service is a minimal staging reference, not production legal templates.

Hybrid (Nest port behind same URL) remains possible without changing hub contract.
