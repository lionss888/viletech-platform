# BDUI experiment notes

## Scope measured

- Role: User only
- Screens: login, forms.list, forms.create, forms.detail
- Layer: Nest `bdui` module + Vite/React renderer

## Verification run (2026-08-25)

Environment: portable Node `v22.14.0` (x64) under `backend-for-ved/.tools/` (gitignored). Host had no system npm/docker.

| Check | Result |
|-------|--------|
| `npm test -- --testPathPattern=modules/bdui` | **PASS** — 2 suites, **12 tests** |
| `bdui-client` `tsc` + `vite build` | **PASS** after pathParams typing fix |
| Live docker-compose + JWT E2E | **Blocked** — docker not installed on this machine |

### Unit test coverage exercised

- `BduiUserActionResolver`: draft/creating/corrections/waiting/completed/empty
- `BduiSchemaService`: login, forms.list, forms.create, forms.detail(+status), unknown page → 404

### Client build artifact

- `fe-experiment/bdui-client/dist/` produced successfully (~172 KB JS gzip 56 KB)

## How to fill runtime metrics (when docker available)

1. Time to first schema response (`GET …/bdui/schema/user/login`)
2. Time to complete login → list → create → detail
3. Count of custom widgets added beyond the plan set
4. Friction: DTO validation blockers on create/accept

## Known MVP limits

- Create form sends only optional `direction` / `paymentMethod` (no org/invoices wizard)
- `forms.detail` actions depend on `?status=` resolved after loading the form
- Paginated list expects `docs` (or `items` / array) from `GET /form-payment`
- Live API smoke still needs: `docker compose up -d`, `.env` Redis `:6380`, NATS, `npm run dev`, `create-bdui-user.js`
