---
name: RD8 Root Admin
overview: "Отладка Root: superadmin dashboard, /admin CRUD, union CTA + root cancel, /testing."
todos:
  - id: rd8-dashboard-admin
    content: Dashboard superadmin + /admin users block/unblock
    status: completed
  - id: rd8-cancel-testing
    content: Root cancel на активной заявке; /testing readable
    status: completed
isProject: false
---

# RD8 — Root & admin

## Meta
- **ID:** RD8 · **Группа:** Платформа · **Зависимости:** RD0 · **Оценка:** 0.5 дня
- **Login:** `root@vdp.local` / `root`
- **Note:** RW* не меняет root wording — здесь только functional debug

## Scope
**In:** admin, dashboard, root cancel, testing page app path.
**Out:** RW copy для root; demo.

## Rules gate
безопасность (admin least privilege в UI), use-cases root cancel, ui-web.

## UI checklist
- [ ] Dashboard superadmin (services, stuck forms)
- [ ] `/admin` — CRUD users, block/unblock
- [ ] На активной заявке — union CTA + root cancel
- [ ] `/testing` — сценарии readable (app)

## API verify
Admin/user endpoints; cancel by root where allowed.

## Fix zones
dashboard-page root branch, admin route, actions.ts rootActions

## DoD
- [ ] Admin CRUD + cancel на активной заявке

## Bug template
| Role | Form ID | Status | CTA | Expected | Actual | Layer | Fix PR |
|------|---------|--------|-----|----------|--------|-------|--------|
| root | … | … | … | … | … | … | … |
