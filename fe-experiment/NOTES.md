# BDUI experiment notes

## Scope measured

- Role: User only
- Screens: login, forms.list, forms.create, forms.detail
- Layer: Nest `bdui` module + Vite/React renderer

## Local setup status (2026-08-25)

| Item | Status |
|------|--------|
| `.env` (Redis 6380, NATS 127.0.0.1) | Created |
| docker compose (mongo/redis/nats/gotenberg) | Up (when Docker running) |
| P0 lifecycle matrix + multi-role schema API | Done |
| Seed 5 roles + org | `scripts/seed-bdui-lifecycle.js` |
| Checklist | [`LIFECYCLE.md`](LIFECYCLE.md) |
| Unit tests `modules/bdui` | **33 PASS** |

Open UI: http://localhost:5173

## Verification run (unit + build)

Environment: portable Node `v22.14.0` (x64) under `backend-for-ved/.tools/` (gitignored).

| Check | Result |
|-------|--------|
| `npm test -- --testPathPattern=modules/bdui` | **PASS** — 2 suites, **12 tests** |
| `bdui-client` `tsc` + `vite build` | **PASS** |

## Known MVP limits

- Create form sends only optional `direction` / `paymentMethod`
- `forms.detail` actions depend on `?status=` after loading the form
- CreateAdmin migration warns without `ADMIN_EMAIL`/`ADMIN_PASSWORD` (harmless for User experiment)
