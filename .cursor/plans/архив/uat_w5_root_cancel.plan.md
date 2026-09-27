---
name: UAT W5 root cancel AuthZ
overview: "Восстановить/починить сценарий root cancel draft из UAT-каталога (F11: 403 на root_cancel)."
todos:
  - id: w5-repro
    content: "Подтвердить ожидаемый endpoint root cancel vs admin nest path"
    status: pending
  - id: w5-authz
    content: "Разрешить root_cancel на draft по матрице ролей + unit AuthZ"
    status: pending
  - id: w5-e2e
    content: "E2E/API: root@ отменяет draft; запрет чужой роли"
    status: pending
  - id: w5-gate
    content: "check-env-parity → go unit AuthZ → ci-pr"
    status: pending
isProject: false
---

# UAT Волна 5: root cancel

## Источник

UAT 2026-09-23 finding **F11**; сценарий `root_cancel` в `vdp/docs/pilot/uat-scenarios.md`.

## Acceptance

1. `root@vdp.local` может отменить **draft** тестовой заявки документированным действием.
2. Чужие роли получают явный запрет (не 500).
3. Статус после cancel валиден по матрице.
4. Admin nest `cancel` либо работает, либо убран из docs — без «unknown nest path».

## Вне scope

- Полный admin UI redesign
- Bank Idempotency (F12 note)

## Сверка с `.cursor/rules`

**Обязательны:** `планирование-сверка-с-rules`, `честность-готовности`, `use-cases`, `безопасность-ролей-и-данных`, `тесты-архитектуры`, `go-testing`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

**Gate:** `check-env-parity` → go unit → **`ci-pr`**.

## Слои

| Слой | Действие |
|---|---|
| Домен | переход root_cancel на draft |
| API | action endpoint + AuthZ |
| Unit | роль root ok / user forbidden |
| E2E | root cancel smoke |
| Docs | uat-scenarios сверить с живым path |
| Notify | «админ может отменить черновик тестовой заявки» |

## DoD / QG

1. `make check-env-parity`
2. Unit AuthZ + transition
3. `ci-pr`
4. F11 закрыт в журнале
