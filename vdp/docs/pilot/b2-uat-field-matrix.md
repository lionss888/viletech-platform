# B.2 UAT field matrix

Source: [вводные/вводные от ви.txt](../../вводные/вводные%20от%20ви.txt) §1.1–1.6.

Decisions: [b2-decisions.md](b2-decisions.md).

## Legend

Column VDP domain. Meaning: field on entity or derivable in core.

Column Payload key. Meaning: key in docs.generate JSON (generated docs only).

Column PDF required. Meaning: must appear in our template (generated) or in uploaded file (client PDF).

### Carrier types

Carrier type Generated PDF. Covers agency contract, order, agent report. UAT checks template ↔ payload.

Carrier type Uploaded PDF. Covers invoice, trade contract, payment proof. UAT checks file plus cross-check to form.

Carrier type Card only. Covers org rating/status. Not a document field.

### Rule

Rule: org contact phone/email and signer are not the same as Account login fields.

## 1. Agency contract (generated)

Columns of this section: Field (TZ), Source (TZ), VDP domain, Payload key, PDF required.

Field Business form. Source Org card / OCR. VDP domain Organization.BusinessForm. Payload key organization_business_form. PDF required yes.

Field Company name. Source Org card. VDP domain Organization.Name. Payload key organization_name. PDF required yes.

Field INN. Source Org card. VDP domain Organization.INN. Payload key organization_inn. PDF required yes.

Field Phone. Source Org card. VDP domain Organization.Phone. Payload key organization_phone. PDF required yes.

Field Email. Source Org card. VDP domain Organization.Email. Payload key organization_email. PDF required yes.

Field Signer position. Source Org card list. VDP domain Organization.SignerPosition. Payload key organization_signer_position. PDF required yes.

Field Signer name. Source Org card. VDP domain Organization.SignerName. Payload key organization_signer_name. PDF required yes.

Field Agent name. Source PA template. VDP domain Agent.Name. Payload key agent_name. PDF required yes.

Field Client signature. Source Upload. VDP domain files API. Payload key none (—). PDF required file.

Field Agent signature. Source Template. VDP domain Agent.SignID / StampID. Payload keys agent_signature_file_id and agent_stamp_file_id. PDF required yes (template).

Field Org card attachment. Source Upload. VDP domain OrganizationCardFileID. Payload key organization_card_file_id. PDF required attachment.

Field Date / number. Source Auto. VDP domain contract entity / form. Payload keys contract_number, contract_date, document_date. PDF required yes.

## 2. Principal order (generated)

Columns of this section: Field (TZ), Source, VDP domain, Payload key, PDF required.

Field Principal name. Source Client org. VDP domain Organization.Name. Payload key organization_name. PDF required yes.

Field Business form, INN, signer. Source Org card. VDP domain org fields. Payload keys organization_ prefixed keys (organization_*). PDF required yes.

Field Agent name. Source PA. VDP domain Agent.Name. Payload key agent_name. PDF required yes.

Field Beneficiary. Source Counterparty. VDP domain Counterparty.Name. Payload key counterparty_name. PDF required yes.

Field Beneficiary requisites. Source Form / CP. VDP domain Counterparty.Banks. Payload key counterparty_banks. PDF required yes.

Field Currency / amount. Source Form. VDP domain Currency and InvoiceAmount. Payload keys currency and invoice_amount. PDF required yes.

Field Payment purpose. Source Form / invoice. VDP domain derived plus PaymentPurpose. Payload key payment_purpose. PDF required yes.

Field Order date. Source Auto. VDP domain generated. Payload key document_date. PDF required yes.

Field Client signature. Source Upload. VDP domain files. Payload key none (—). PDF required file.

Field Rate / commission. Source Manager. VDP domain Rate and Commission. Payload keys rate_ prefixed and fee_ prefixed (rate_*, fee_*). PDF required yes (except POSTPAY_RATE_ON_PP primary).

Field Kind import/export. Source Direction. VDP domain Direction. Payload keys kind and direction. PDF required yes (template variant).

## 3. Agent report (generated)

Columns of this section: Field (TZ), Source, VDP domain, Payload key, PDF required.

Field Principal block. Source Org card. VDP domain org fields. Payload keys organization_ prefixed keys (organization_*). PDF required yes.

Field Agency contract ref. Source Contract. VDP domain ContractID plus number/date. Payload keys contract_id, contract_number, contract_date. PDF required yes.

Field Order ref. Source Form / order. VDP domain form id and POG. Payload keys form_payment_id and order_number. PDF required yes.

Field Amount CP currency. Source Form. VDP domain InvoiceAmount and Currency. Payload keys invoice_amount and currency. PDF required yes.

Field FX rate. Source Manager. VDP domain Rate.Value. Payload key rate_value. PDF required yes.

Field RUB equivalent. Source Calculation. VDP domain derived (D5 open). Payload key rub_equivalent. PDF required yes.

Field Actual agent amount. Source Manual. VDP domain ActualPaymentAmount. Payload key actual_payment_amount. PDF required yes.

Field Payment proof. Source Upload. VDP domain file. Payload key none (—). PDF required file.

Field Payment date. Source On upload. VDP domain ActualPaymentDate. Payload key actual_payment_date. PDF required yes.

## 4. Invoice (uploaded)

Columns of this section: Field, VDP, UAT.

Field Number/date. VDP invoice_json or manual. UAT in file or form; cross-check.

Field Parties, goods, Incoterms. VDP CP plus invoice_json. UAT in file; OCR optional (D2).

Field Currency. VDP Form.Currency. UAT must match form.

Field 15 MB limit. VDP upload handler. UAT reject oversize.

## 5. Trade contract (uploaded)

Columns of this section: Field, VDP, UAT.

Field Number/date. VDP contract_number and contract_date. UAT form plus file.

Field Parties. VDP org plus CP names/INN. UAT file.

Field Amount/currency. VDP form. UAT cross-check.

Not the same as agency contract (generated per PA).

## 6. Payment confirmation (uploaded)

Columns of this section: Field, VDP, UAT.

Field File. VDP files API. UAT required.

Field Sum/currency. VDP partial validation. UAT warn on mismatch (FE wave 3).

## Blocking gaps (pre–wave 1)

Gap one. Organization missing signer/contact/business form fields.

Gap two. Payload docs_payload missing agent name, CP banks, purpose, report fields.

Gap three. No staging DOCS_URL with non-stub PDF samples.
