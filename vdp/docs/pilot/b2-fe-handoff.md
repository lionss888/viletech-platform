# B.2 FE handoff (machine 2)

Backend waves 0–2 on machine 1. Execute on machine 2 after W1–W4 API auth path.

## Prerequisites

- [b2-uat-field-matrix.md](b2-uat-field-matrix.md)
- Org PATCH accepts signer/contact fields (see `PATCH /api/v1/organization/{id}`)
- Files: `POST /api/v1/file-store/upload`, `POST /api/v1/forms/{id}/docs/attach`
- Preview: `GET /api/v1/file-store/preview/private/{id}`

## Checklist

### Org card

- [ ] Edit `business_form`, org `phone`, org `email` (not Account login)
- [ ] Edit `signer_name`, `signer_position`, `signer_other_position` when position is `other`
- [ ] Show read-only INN/name after ICO freeze

### Wizard step 2 — invoice & trade contract

- [ ] Upload PDF (max 15 MB) or «no documents» + manual contract number/date
- [ ] Attach with correct doc kind via `docs/attach`
- [ ] Show inline error on 413 payload too large

### Steps 5–7 — generated docs

- [ ] Download generated order/contract/report (preview API)
- [ ] Upload signed contract, order, report
- [ ] Status transitions only via domain actions (no local mock status)

### Payment confirmation

- [ ] Optional upload; soft warning if amount/currency ≠ form (non-blocking)

### E2E

- [ ] Restore Playwright specs under `fe/e2e/` (post-Lovable sync)
- [ ] Journey: compliance → assign PA → rate → order generate → sign upload → payment → report

## Out of scope (machine 2)

- Diadoc UI (D1 manual only on pilot)
- OCR prefill UI (D2 optional later)

Related plans: `w3_fe_domain_actions`, `w4_fe_create_form`, `fe_core_integration`.
