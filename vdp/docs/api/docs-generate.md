# DOCS generate API (B.2)

Hub adapter posts JSON to DOCS_URL (see [hub/internal/adapters/docs/docs.go](../../hub/internal/adapters/docs/docs.go)).

Reference implementation: [docs-service/](../../docs-service/).

## Request

Request line POST {DOCS_URL}.

Header Content-Type: application/json.

### Request fields

Columns of this section: Field, Type, Required, Description.

Field form_payment_id. Type string. Required yes. Description: form id.

Field kind. Type string. Required yes. Description: one of import_order, export_order, agent_report, agency_contract, payment_order.

Field direction. Type string. Required no. Description: import or export.

Field template_id. Type string. Required no. Description: PA contract template id.

Field template_file_id. Type string. Required no. Description: stored template file.

Field organization_ prefixed keys (organization_*). Type string. Required no. Description: org card plus signer fields.

Field agent_name. Type string. Required no. Description: payment agent legal name.

Field counterparty_banks. Type array. Required no. Description: bank accounts from CP card.

Field payment_purpose. Type string. Required no. Description: payment assignment text.

Field document_date. Type string. Required no. Description: ISO date for generated doc.

Fields rate_value, fee_ prefixed keys (fee_*), invoice_amount, currency. Type string. Required no. Description: order/report amounts.

Fields rub_equivalent and actual_payment_ prefixed keys (actual_payment_*). Type string. Required no. Description: report (D5 provisional).

Full field matrix: [../pilot/b2-uat-field-matrix.md](../pilot/b2-uat-field-matrix.md).

## Response

Columns of this section: Field, Type, Description.

Field status. Type string. Description: generated or failed.

Field storage_key. Type string. Description: object key in blob storage.

Field mime. Type string. Description: application/pdf.

Field content. Type string. Description: optional inline PDF bytes (dev/staging only).

## Errors

Status 4xx — validation; hub does not retry.

Status 503 — transient; hub retries with backoff.

## Dev without DOCS_URL

Hub returns stub docs/{form_payment_id}/stub.pdf — not legal UAT.
