# B.2 UAT field matrix

Source: [вводные/вводные от ви.txt](../../вводные/вводные%20от%20ви.txt) §1.1–1.6.  
Decisions: [b2-decisions.md](b2-decisions.md).

## Legend

| Column | Meaning |
|--------|---------|
| VDP domain | Field on entity or derivable in core |
| Payload key | Key in `docs.generate` JSON (generated docs only) |
| PDF required | Must appear in our template (generated) or in uploaded file (client PDF) |

Carrier types:

- **Generated PDF** — agency contract, order, agent report: UAT checks template ↔ payload.
- **Uploaded PDF** — invoice, trade contract, payment proof: UAT checks file + cross-check to form.
- **Card only** — org rating/status: not a document field.

**Rule:** org contact phone/email and signer ≠ `Account` login fields.

---

## 1. Agency contract (generated)

| Field (TZ) | Source (TZ) | VDP domain | Payload key | PDF required |
|------------|-------------|------------|-------------|--------------|
| Business form | Org card / OCR | `Organization.BusinessForm` | `organization_business_form` | yes |
| Company name | Org card | `Organization.Name` | `organization_name` | yes |
| INN | Org card | `Organization.INN` | `organization_inn` | yes |
| Phone | Org card | `Organization.Phone` | `organization_phone` | yes |
| Email | Org card | `Organization.Email` | `organization_email` | yes |
| Signer position | Org card list | `Organization.SignerPosition` | `organization_signer_position` | yes |
| Signer name | Org card | `Organization.SignerName` | `organization_signer_name` | yes |
| Agent name | PA template | `Agent.Name` | `agent_name` | yes |
| Client signature | Upload | files API | — | file |
| Agent signature | Template | `Agent.SignID` / `StampID` | `agent_signature_file_id`, `agent_stamp_file_id` | yes (template) |
| Org card attachment | Upload | `OrganizationCardFileID` | `organization_card_file_id` | attachment |
| Date / number | Auto | contract entity / form | `contract_number`, `contract_date`, `document_date` | yes |

---

## 2. Principal order (generated)

| Field (TZ) | Source | VDP domain | Payload key | PDF required |
|------------|--------|------------|-------------|--------------|
| Principal name | Client org | `Organization.Name` | `organization_name` | yes |
| Business form, INN, signer | Org card | org fields | `organization_*` | yes |
| Agent name | PA | `Agent.Name` | `agent_name` | yes |
| Beneficiary | Counterparty | `Counterparty.Name` | `counterparty_name` | yes |
| Beneficiary requisites | Form / CP | `Counterparty.Banks` | `counterparty_banks` | yes |
| Currency / amount | Form | `Currency`, `InvoiceAmount` | `currency`, `invoice_amount` | yes |
| Payment purpose | Form / invoice | derived + `PaymentPurpose` | `payment_purpose` | yes |
| Order date | Auto | generated | `document_date` | yes |
| Client signature | Upload | files | — | file |
| Rate / commission | Manager | `Rate`, `Commission` | `rate_*`, `fee_*` | yes (except POSTPAY_RATE_ON_PP primary) |
| Kind import/export | Direction | `Direction` | `kind`, `direction` | yes (template variant) |

---

## 3. Agent report (generated)

| Field (TZ) | Source | VDP domain | Payload key | PDF required |
|------------|--------|------------|-------------|--------------|
| Principal block | Org card | org fields | `organization_*` | yes |
| Agency contract ref | Contract | `ContractID`, number/date | `contract_id`, `contract_number`, `contract_date` | yes |
| Order ref | Form / order | form id, POG | `form_payment_id`, `order_number` | yes |
| Amount CP currency | Form | `InvoiceAmount`, `Currency` | `invoice_amount`, `currency` | yes |
| FX rate | Manager | `Rate.Value` | `rate_value` | yes |
| RUB equivalent | Calculation | derived (D5 open) | `rub_equivalent` | yes |
| Actual agent amount | Manual | `ActualPaymentAmount` | `actual_payment_amount` | yes |
| Payment proof | Upload | file | — | file |
| Payment date | On upload | `ActualPaymentDate` | `actual_payment_date` | yes |

---

## 4. Invoice (uploaded)

| Field | VDP | UAT |
|-------|-----|-----|
| Number/date | `invoice_json` / manual | in file or form; cross-check |
| Parties, goods, Incoterms | CP + `invoice_json` | in file; OCR optional (D2) |
| Currency | `Form.Currency` | must match form |
| 15 MB limit | upload handler | reject oversize |

---

## 5. Trade contract (uploaded)

| Field | VDP | UAT |
|-------|-----|-----|
| Number/date | `contract_number`, `contract_date` | form + file |
| Parties | org + CP names/INN | file |
| Amount/currency | form | cross-check |

Not the same as **agency contract** (generated per PA).

---

## 6. Payment confirmation (uploaded)

| Field | VDP | UAT |
|-------|-----|-----|
| File | files API | required |
| Sum/currency | partial validation | warn on mismatch (FE wave 3) |

---

## Blocking gaps (pre–wave 1)

1. Organization missing signer/contact/business form fields.
2. `docs_payload` missing agent name, CP banks, purpose, report fields.
3. No staging `DOCS_URL` with non-stub PDF samples.
