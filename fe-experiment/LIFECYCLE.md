# Lifecycle checklist (BDUI / fe-experiment)

Канонический happy-path: **import + аванс + товар**.

## Accounts (seed)

```bash
cd fe-experiment/backend-for-ved
node scripts/seed-bdui-lifecycle.js
```

| Email | Password (default) | Role |
|-------|--------------------|------|
| user@bdui.local | BduiUser2024! | user |
| ico@bdui.local | BduiLifecycle2024! | internal_compliance_officer |
| eco@bdui.local | BduiLifecycle2024! | compliance_officer |
| manager@bdui.local | BduiLifecycle2024! | manager |
| provider@bdui.local | BduiLifecycle2024! | provider |

Organization for User: `ООО BDUI Тест` (INN 7707083893), status `not_approved` (first deal → Internal CO).

## Schema API (P0)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/1.0/bdui/schema/{role}/login` | public |
| GET | `/api/1.0/bdui/schema/{role}/{page}?status=` | JWT |

Roles: `user`, `internal_compliance_officer`, `compliance_officer`, `manager`, `provider`.  
Pages (staff): `login`, `forms.list`, `forms.detail`. User also: `forms.create`.

## Quality gate P0

- [x] `npm test -- --testPathPattern=modules/bdui --no-coverage` (33 passed)
- [x] Seed script runs without error
- [ ] `GET …/bdui/schema/user/login` → 200 (requires `npm run dev`)
- [ ] `GET …/bdui/schema/manager/login` → 200 (requires `npm run dev`)
- [x] Matrix unit coverage: User / ICO / ECO / Manager / Provider + cross-role isolation

## Happy-path walkthrough (P1–P6)

1. [x] P1 User create + submit
2. [x] P2 Internal CO approve org
3. [x] P3 External CO accept form
4. [x] P4 Manager order + assign provider / payment start
5. [x] P5 Provider execute payment
6. [x] P6 User close docs + Manager COMPLETED

## Quality gate P1

- [x] Unit: schema builders create/list/detail (`npm test -- --testPathPattern=modules/bdui` — 37 passed)
- [x] Manual API: User seed → create → PATCH deal/org → invoice → `PUT …/form/accept` → `organization_waiting_verification`
- [x] Negativ: accept без обязательных полей → 400 с понятным `message`, UI показывает ошибку
- [x] Список User показывает созданную заявку; чужой site-кабинет не видит форму (404)
- [x] Самопроверка: accept разрешён User на `draft`/`creating` (матрица + detail schema)

## Quality gate P2

- [x] Unit: ICO queue/detail + matrix isolation (User/Manager без ICO CTA) — BDUI tests 42 passed
- [x] Manual: ICO login → queue → start → org approve → form accept → `form_waiting_verification`
- [x] Return: ICO reject → `form_waiting_corrections`; User schema показывает `accept_corrections`
- [x] User schema: `org_lock_review` / `org_lock_decided` после решения ICO
- [x] Manager schema на org-waiting: пустой action_bar (нет ICO CTA)

## Quality gate P3

- [x] Unit: ECO queue/detail + isolation (User без ECO CTA) — BDUI tests 45 passed
- [x] Seed: active HS code `0101210000` (loyalty `ok`) for ECO accept validation
- [x] Manual happy-path: ECO start → accept → `form_accepted`
- [x] Manual reject → `form_waiting_corrections` + `rejectText` виден User; schema `accept_corrections`
- [x] Cancel → `canceled_by_compliance_officer`; User re-submit запрещён; hint `eco_canceled_hint`
- [x] Идемпотентность: повторный accept → domain 400 (`Can not transit status from form_accepted`)

## Quality gate P4

- [x] Unit: Manager list/detail + matrix chain form_accepted → signing_order_* → payment_* — BDUI tests 51+ passed
- [x] Seed: Agent + accepted Contract + stub file; Provider account id printed
- [x] Manual: attach/signing → User upload_order CTA → order start/accept → assign provider → payment received/start → `payment_processing`
- [x] Provider queue видит заявку после assign
- [x] Order reject → `signing_order_waiting_corrections`; User CTA `upload_order`
- [x] Provider schema на `form_accepted`: без Manager CTA
- [x] `order/generate` wired (S3 may 500 locally → stub attach fallback)

## Quality gate P5

- [x] Unit/contract: `FormPaymentProviderViewDto` deny-list (no `account`/`manager`/org email-phone) — 63 tests with BDUI
- [x] Unit: Provider matrix only on payment_* / signing_order_accepted; empty on `manager_checking`
- [x] Manual: attach proof → `payment/sent` → `payment_sent`
- [x] Return → `manager_checking`; Manager CTA `mgr_payment_start`; Provider execute запрещён
- [x] Чужая заявка другого provider → 404

## Quality gate P6

- [x] Unit: User/Manager closing statuses (report/shipment) + empty CTAs on `COMPLETED` — BDUI tests 70 passed
- [x] Manual: `payment_sent` → report signing → User report → report start/accept → User shipment → shipment start/accept → `COMPLETED`
- [x] Регрессия: после `COMPLETED` User/Provider/Manager schema без mutate CTA
- [x] Аванс: отгрузка (`shipment/accept` + stub `addClosing`) обязательна до complete
- [x] Самопроверка: финальный переход только Manager `shipment/accept` / `completed` из `shipment_verification`

## Branches (P7)

- [x] Corrections ECO↔User
- [x] Cancel (User / ECO)
- [x] Postpay path

## Quality gate P7

- [x] Unit: corrections/cancel/postpay statuses + empty CTAs on canceled/COMPLETED — BDUI tests 76 passed
- [x] Manual: ECO reject → `form_waiting_corrections` → User `accept-corrections` → `form_waiting_verification`
- [x] Manual: User cancel + ECO cancel → terminal status, schema without mutate CTA
- [x] Manual/docs: postpay StageHash checklist + BDUI actions (`NOTES.md`); advance-order cycle OK; full COMPLETED needs `direction=import` (blocker documented if missing)
- [x] Регрессия: advance happy-path actions still resolve (matrix + schemas)
- [x] Самопроверка StageHash advance vs postpay зафиксирована в `NOTES.md`
