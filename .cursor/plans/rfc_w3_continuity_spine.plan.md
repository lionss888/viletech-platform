---
name: RFC W3 Continuity Spine
overview: "Преемственность U→M→P: выключенный слот не gate; включённый mandatory участник — gate; 1–4 без soft-lock и без BPM."
todos:
  - id: w3-gate-rule
    content: "Правило: disabled process actor → слот не gate; manager/root advance"
    status: pending
  - id: w3-spine-actions
    content: "Проверить/дотянуть AuthZ actions стержня user/manager/provider return paths"
    status: pending
  - id: w3-reenable-gate
    content: "Enable+mandatory ICO/ECO снова требует их шаг; затем M→P"
    status: pending
  - id: w3-journey-tests
    content: "Service journey tests a/b/c/d преемственности"
    status: pending
isProject: false
---

# RFC W3 — Continuity spine U→M→P

**Мастер:** [roles_finalize_corrections_d10e6a7d.plan.md](roles_finalize_corrections_d10e6a7d.plan.md)  
**Зависимости:** W1, W2  
**Следующая:** W4

## Цель

Проверяемая преемственность 1–4: стержень клиент→менеджер→провайдер работает при выключенном compliance; включение участника добавляет gate, не ломая 1–3.

## Сверка с `.cursor/rules`

Наследует матрицу мастера. Срез волны:

**Обязательны:** `планирование-сверка-с-rules`, `базовые-правила-инструмента`, `правила-построения`, `честность-готовности`, `use-cases`, `чистая-архитектура`, `solid`, `интеграция-и-события` (UI/config ≠ статус; TargetStatus в коде), `безопасность-ролей-и-данных` (Provider без ПДн; AuthZ роли на шаге), `устойчивость-и-наблюдаемость` (disabled actor → явный advance, не soft-lock/spinner), `тесты-архитектуры` (journey unit/service, не combinatorial E2E), `go-testing`, `go-architecture`, `go-observability` (correlation/id заявки в отказах — минимум).

**Вне scope волны:** FE; BPM insert stage / смена графа TargetStatus; Nest KPI; ML; serverless; `vdp-fe-docker-пересборка`.

**Gate/DoD-чеки:** journey (a)–(e); тест запрета чужой роли на стержне; нет soft-lock при ICO/ECO off; честно «стержень пилота», не полный Nest lifecycle.


## Правило gate (зафиксировано)

- Актёр слота `enabled=false` → слот **не** gate: Manager (effective `manager.ops`) и root могут advance через существующие Action слота (эквивалент approve/skip на том же статусе), без выдачи ПДн Provider.
- Актёр `enabled=true` и `mandatory=true` → только роль слота (и root system) проводит шаг; manager не обходит.
- Не переписывать TargetStatus при submit автоматически.

## Стержень (DoD 1–3)

| Шаг | Роль | Действия |
|---|---|---|
| 1 | user | create + submit → статус/очередь менеджера |
| 2 | manager | return to user **или** send/assign provider |
| 3 | provider | complete **или** return manager (clarify/reject) |

## Тесты journey

- (a) ICO+ECO off → U→M→P end-to-end service
- (b) enable ICO mandatory → после submit нужен ICO, затем M→P
- (c) disable при mandatory=true → 400
- (d) root не в process snapshot list
- (e) provider return path к manager не ломается

Точки входа: service-layer form transitions + process policy snapshot; не полный Playwright (тот — W6 точечно).

## DoD W3

- [ ] (a)–(e) green
- [ ] Нет soft-lock на org/form waiting при disabled compliance
- [ ] Честно: «стержень пилота», не «полный Nest lifecycle»
