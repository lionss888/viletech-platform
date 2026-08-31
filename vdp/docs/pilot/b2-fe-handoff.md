# B.2 FE handoff (machine 2)

Backend waves 0–2 on machine 1. Execute on machine 2 after W1–W4 API auth path.

## Prerequisites

[b2-uat-field-matrix.md](b2-uat-field-matrix.md)

Org PATCH accepts signer/contact fields (see PATCH /api/v1/organization/{id}).

Files: POST /api/v1/file-store/upload, POST /api/v1/forms/{id}/docs/attach.

Preview: GET /api/v1/file-store/preview/private/{id}.

## Checklist

### Org card

Edit business_form, org phone, org email (not Account login). Status done.

Edit signer_name, signer_position, signer_other_position when position is other. Status done.

Show read-only INN/name after ICO freeze. Status done.

### Wizard step 2 — invoice & trade contract

Upload PDF (max 15 MB) or «no documents» + manual contract number/date. Status done.

Attach with correct doc kind via docs/attach. Status done.

Show inline error on 413 payload too large. Status done.

### Steps 5–7 — generated docs

Download generated order/contract/report (preview API). Status done.

Upload signed contract, order, report. Status done.

Status transitions only via domain actions (no local mock status). Status done.

### Payment confirmation

Optional upload; soft warning if amount/currency ≠ form (non-blocking). Status done.

### E2E

Restore Playwright specs under fe/e2e/ (post-Lovable sync). Status done.

Journey: compliance → assign PA → rate → order generate → sign upload → payment → report. Status not done.

## Out of scope (machine 2)

Diadoc UI (D1 manual only on pilot).

OCR prefill UI (D2 optional later).

Related plans: w3_fe_domain_actions, w4_fe_create_form, fe_core_integration.
