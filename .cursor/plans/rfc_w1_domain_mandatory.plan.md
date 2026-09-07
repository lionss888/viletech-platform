---
name: RFC W1 Domain Mandatory
overview: "Домен: RoleProcessConfig.Mandatory в snapshot; root не process-eligible; seed пилота ICO/ECO off; Validate без «methodology fixed in code»."
todos:
  - id: w1-struct-mandatory
    content: "Добавить Mandatory в RoleProcessConfig + DefaultProcessPolicySnapshot (без root; ICO/ECO off)"
    status: pending
  - id: w1-resolve-mandatory
    content: "IsMandatoryProcessRole(role, snap) из config; StageBindings только seed/fallback"
    status: pending
  - id: w1-validate
    content: "ValidateRoleConfigUpdate: смена mandatory OK; disable только если !mandatory"
    status: pending
  - id: w1-unit
    content: "Unit role_config / effective / account_rbac под новую семантику"
    status: pending
isProject: false
---

# RFC W1 — Domain: mandatory + root out

**Мастер:** [roles_finalize_corrections_d10e6a7d.plan.md](roles_finalize_corrections_d10e6a7d.plan.md)  
**Зависимости:** нет (первая волна)  
**Следующая:** W2

## Цель

Сделать «обязательная» свойством process config (1A), убрать root из доменного участия, зафиксировать пилотный seed без compliance-gate.

## Сверка с `.cursor/rules`

Наследует матрицу мастера [roles_finalize_corrections_d10e6a7d.plan.md](roles_finalize_corrections_d10e6a7d.plan.md). Ниже — срез волны.

**Обязательны:** `планирование-сверка-с-rules`, `базовые-правила-инструмента`, `правила-построения`, `честность-готовности`, `чистая-архитектура`, `solid`, `use-cases`, `детали-как-плагины`, `screaming-architecture`, `безопасность-ролей-и-данных`, `интеграция-и-события` (политика в домене), `тесты-архитектуры`, `go-architecture`, `go-testing`.

**Вне scope волны:** HTTP/migration (W2); journey bypass (W3); FE/UX; `nestjs-*`; ML; serverless; `vdp-fe-docker-пересборка`; BPM.

**Gate/DoD-чеки:** unit mandatory/disable; root never process-eligible/mandatory; default ICO/ECO off; без ложного «completed программы».


## Шаги

1. [`role_config.go`](vdp/core/internal/domain/formpayment/role_config.go): поле `Mandatory bool` на `RoleProcessConfig`.
2. `DefaultProcessPolicySnapshot`: удалить любые следы root; user/manager/provider(/senior_provider) `Mandatory=true`, `Enabled=true`; ICO/ECO `Mandatory=false`, `Enabled=false`; sales/viewer optional; treasurer/bank/one_c по текущей продуктовой логике с явным mandatory.
3. [`stage_binding.go`](vdp/core/internal/domain/formpayment/stage_binding.go): `IsMandatoryProcessRole` принимает snapshot (или helper `MandatoryFromConfig`); `StageBindings().Mandatory` — только для seed/backfill, не runtime truth.
4. `Removable()` / validate: `enabled=false` запрещён iff `cfg.Mandatory`; сообщение без «fixed in code».
5. `IsProcessEligibleRole` — без изменений (admin/root out).
6. Тесты: root never mandatory; ICO default not mandatory; cannot disable when mandatory; can flip mandatory then disable.

## DoD W1

- [ ] Domain compiles; unit green
- [ ] Default snapshot без root; ICO/ECO disabled+non-mandatory
- [ ] Нет утверждения «паритет 100%» — только domain gate
