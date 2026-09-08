# Customer pack import checklist (W4)

1. Receive archive/dir from customer (org, counterparty, PDFs, deal fields).
2. `cd vdp && ./scripts/robot-fixtures-import.sh /path/to/pack`
3. Confirm `packs/customer/pack.json` has `status: ready` and non-empty amounts/names.
4. `export VDP_ROBOT_FIXTURE_PACK=customer`
5. `make compose-e2e && make playwright-pilot-matrix`
6. `./scripts/robot-matrix-discrepancy-report.sh pass` (or `fail`)
7. On green: update `e2e-coverage-matrix.md` fixture column to customer; then `make release-gate` and `notify-mgmt KIND=gate`.

Do not commit sensitive customer PDFs (gitignored under `packs/customer/docs/*`).
