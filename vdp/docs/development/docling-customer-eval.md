# Docling pilot: customer file eval sheet

How to score 10 to 20 real invoices or contracts in a customer meeting. Side-path only: operator still confirms; no auto-pay.

## Goal

Measure usefulness of Docling PRIMARY (layout plus light field heuristics) versus manual entry. Decide whether to keep Docling as the base engine and add commercial or own engines later on the same port.

## Setup

Local: docker compose up with docling healthy; EXTRACTION_PRIMARY equals docling; make extraction-docling-smoke green.

Alpha: extraction /health shows primary equals docling; one seed-user upload reaches the HITL panel with engine_id equals docling or an honest partial.

## Per file

Record one row per document with these columns in a spreadsheet.

Column file_id. Short name of the sample (customer keeps the original).

Column saw_layout. Yes if the operator can read document text or layout in the review panel or warnings.

Column amount_guess. Yes if invoice amount matched or was close enough to save typing; Partial if wrong currency or separator; No if empty or useless.

Column number_date. Yes or Partial or No for invoice number and date.

Column company. Yes or Partial or No for seller or company name.

Column hitl_edits. Rough count of fields the operator changed before confirm.

Column minutes. Time from open review to confirm or abandon.

Column notes. Free text covering language, scan quality, multi-page PDF, tables.

## Session rollup

Count files where amount_guess equals Yes. Count files where the operator said the prefill saved time overall. Note blockers such as timeouts, empty payload, or wrong engine_id.

## Continuity message

Docling is the only PRIMARY on this pilot. Later a commercial IDP or own model can plug into the same extraction port without changing application statuses. Empty fields are expected; HITL remains mandatory.

## Honesty

This is not commercial invoice-IDP parity. The meeting measures helpfulness on their files, not a claim of full IE or analytics.
