---
name: RD1 User App
overview: "DONE. User app: create → draft (auto recognize) → submit → uploads → visibility своих заявок."
todos:
  - id: rd1-create-draft
    content: Wizard create → status draft (auto recognize_complete)
    status: completed
  - id: rd1-submit
    content: Submit → organization_waiting_verification
    status: completed
  - id: rd1-visibility
    content: Реестр только своих заявок
    status: completed
  - id: rd1-uploads
    content: Upload CTA по статусам user.*
    status: completed
isProject: false
---

# RD1 — User (app)

## Meta
- **ID:** RD1 · **Группа:** Клиент · **Зависимости:** RD0 · **Оценка:** ~1 день
- **Login:** `user@vdp.local` / `user` · **Entry:** `/forms/new`, `/forms`

## Scope
**In:** app User happy path до ICO-очереди; uploads.
**Out:** demo; ICO/ECO; Playwright; RW1 (можно параллельно).

## Rules gate
use-cases, безопасность (User только свои), ui-web-практики, интеграция-и-события, тесты-архитектуры.

## UI checklist
- [x] `/forms/new` — wizard, invoice/contract upload
- [x] После create: статус **draft** ([platform-create.ts](../vdp/fe/src/lib/ved/platform-create.ts))
- [x] «Отправить на проверку» → `organization_waiting_verification`
- [x] Реестр: только свои заявки
- [x] Upload-ветки: contract, order, payment, report, shipment ([actions.ts](../vdp/fe/src/lib/ved/actions.ts) user.*)

## API verify
После create `GET /api/v1/forms/{id}` status=draft; submit mirror compose-e2e user steps.

## Fix zones
platform-store createFormLocal, ActionPanel upload, forms-new-page, action-bridge, platform-create

## DoD
- [x] Одна заявка до ICO-очереди без ручного curl
- [x] Unit при фиксе bridge/create

**Status:** done (2026-08-29) · bug notes: [vdp/rd0-baseline.md](../vdp/rd0-baseline.md)

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| user | … | … | … | … | … | UI/bridge/core | … |
