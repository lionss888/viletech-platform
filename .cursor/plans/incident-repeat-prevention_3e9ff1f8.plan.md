---
name: incident-repeat-prevention
overview: Устранить причины инцидента в E2E и добавить страховки в CI/процессе, чтобы регресс не проходил в main и быстрее диагностировался.
todos:
  - id: stabilize-file-locators
    content: Добавить и использовать testid для модального file input, убрать хрупкие CSS-селекторы в e2e.
    status: pending
  - id: harden-pilot-matrix
    content: Закрепить ветвление по допустимым статусам после assign_agent и покрыть happy path matrix-спеком.
    status: pending
  - id: ci-pilot-gate
    content: Добавить PR-guardrail для pilot-matrix при релевантных изменениях в FE/E2E/domain status logic.
    status: pending
  - id: mirror-preflight
    content: Выделить preflight проверку mirror secrets/target с явной категоризацией причин падения.
    status: pending
  - id: verify-local-gates
    content: Прогнать ci-pr и целевой playwright matrix before claiming merge readiness.
    status: pending
isProject: false
---

# План предотвращения повторения инцидента

## Scope
- Зафиксировать устойчивость критичного E2E-сценария в [vdp/fe/e2e/pilot-matrix-full-ladder.spec.ts](/Users/levpogosov/Downloads/viletech-platform/vdp/fe/e2e/pilot-matrix-full-ladder.spec.ts).
- Сделать локаторы загрузки файлов детерминированными через явный `data-testid` в [vdp/fe/src/components/ved/ActionPanel.tsx](/Users/levpogosov/Downloads/viletech-platform/vdp/fe/src/components/ved/ActionPanel.tsx) и обновить тесты.
- Добавить CI-страховку, чтобы ветка `pilot-matrix` проверялась до merge при релевантных изменениях в [vdp-ci.yml](/Users/levpogosov/Downloads/viletech-platform/.github/workflows/vdp-ci.yml).
- Добавить preflight-конфиг проверку mirror-секретов/target в [vdp-mirror-gitlab.yml](/Users/levpogosov/Downloads/viletech-platform/.github/workflows/vdp-mirror-gitlab.yml) как отдельный ранний сигнал.

## Rules Alignment
- **Обязательные rules для этого плана:**
  - `vdp-ci-local-gate`: перед заявлением готовности прогон `cd vdp && make ci-pr` (или `ci-pr-fast` только с явной оговоркой по browser).
  - `тесты-архитектуры` + `playwright-e2e`: усиливаем критичный journey и устойчивые локаторы (`getByTestId`/роль), без хрупких CSS-селекторов.
  - `правила-построения` + `go-testing`/`nestjs-testing` (в части принципа): новые/измененные публичные поведения покрываем тестами.
  - `безопасность-ролей-и-данных`: не расширяем доступ provider и не добавляем PII в артефакты/логи.
- **Вне scope:**
  - Редизайн бизнес-процесса статусов и ролей в домене.
  - Полная перестройка CI topology/оркестрации beyond targeted guardrails.
  - Изменение deployment-пайплайна release-gate.

## Implementation Steps
1. Вынести в UI явный `data-testid` для модального file input в ActionPanel, чтобы тесты не зависели от количества `input[type=file]` на странице.
2. Обновить `pilot-matrix` и родственные спеки на устойчивый локатор и закрепить ветвление по валидным доменным статусам после `assign_agent` (включая `signing_order`).
3. В CI добавить отдельный job (или расширить `playwright`) для `@pilot-matrix` на PR при изменениях в `vdp/fe/e2e/**`, `vdp/fe/src/lib/ved/actions.ts`, `vdp/core/internal/domain/formpayment/**`.
4. В mirror workflow добавить ранний preflight step/job с явным reason-кодом (missing secrets / invalid target), чтобы отличать infra-config сбой от кодового регресса.
5. Обновить локальный gate-порядок проверки для релевантных правок: `make ci-pr` + целевой `PLAYWRIGHT_ARGS='e2e/pilot-matrix-full-ladder.spec.ts' make playwright-e2e`.

## Verification / DoD
- Локально:
  - `cd vdp && make ci-pr`
  - `cd vdp && PLAYWRIGHT_ARGS='e2e/pilot-matrix-full-ladder.spec.ts' make playwright-e2e`
- В CI:
  - PR на релевантных правках запускает и проходит пилотный matrix-check до merge.
  - При отсутствии mirror secret ошибка показывается как отдельный preflight сигнал, без смешивания с продуктовым регрессом.
- Результат:
  - Инцидентный путь из этого кейса не воспроизводится (детерминированные локаторы + корректная ветка статусов).