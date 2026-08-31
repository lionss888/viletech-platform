# DOCS generate API (B.2)

Hub adapter posts JSON to `DOCS_URL` (see [hub/internal/adapters/docs/docs.go](../../hub/internal/adapters/docs/docs.go)).

Reference implementation: [docs-service/](../../docs-service/).

## Request

`POST {DOCS_URL}`  
`Content-Type: application/json`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `form_payment_id` | string | yes | Form id |
| `kind` | string | yes | `import_order`, `export_order`, `agent_report`, `agency_contract`, `payment_order` |
| `direction` | string | no | `import` / `export` |
| `template_id` | string | no | PA contract template id |
| `template_file_id` | string | no | Stored template file |
| `organization_*` | string | no | Org card + signer fields |
| `agent_name` | string | no | Payment agent legal name |
| `counterparty_banks` | array | no | Bank accounts from CP card |
| `payment_purpose` | string | no | Payment assignment text |
| `document_date` | string | no | ISO date for generated doc |
| `rate_value`, `fee_*`, `invoice_amount`, `currency` | string | no | Order/report amounts |
| `rub_equivalent`, `actual_payment_*` | string | no | Report (D5 provisional) |

Full field matrix: [../pilot/b2-uat-field-matrix.md](../pilot/b2-uat-field-matrix.md).

## Response

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `generated` or `failed` |
| `storage_key` | string | Object key in blob storage |
| `mime` | string | `application/pdf` |
| `content` | string | Optional inline PDF bytes (dev/staging only) |

## Errors

- `4xx` — validation; hub does not retry
- `503` — transient; hub retries with backoff

## Dev without DOCS_URL

Hub returns stub `docs/{form_payment_id}/stub.pdf` — not legal UAT.
