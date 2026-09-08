# Customer fixture pack

Status: awaiting import. Do not claim QG 100% on customer data until this pack is filled and robots are green with `VDP_ROBOT_FIXTURE_PACK=customer`.

## Import

```sh
cd vdp
./scripts/robot-fixtures-import.sh /path/to/customer-archive-or-dir
```

Place organization / counterparty / deal fields into `pack.json` and PDFs under `docs/`. Sensitive files under this tree are gitignored except `pack.json`, `README.md`, and `.gitkeep`.

## Activate

```sh
export VDP_ROBOT_FIXTURE_PACK=customer
make playwright-pilot-matrix
make compose-e2e
```
