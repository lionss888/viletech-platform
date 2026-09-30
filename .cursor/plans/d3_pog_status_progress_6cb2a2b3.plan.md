---
name: D3 POG status progress
overview: "Срез D3: согласованный copy статуса vs POG, прогресс генерации PDF, скрытие виджета после success (#6, #7, #13). Gate ci-pr."
todos:
  - id: d3-status-copy
    content: Проекция copy/badge status+pogStatus (idle=ожидает формирования)
    status: completed
  - id: d3-progress-hide
    content: Indeterminate progress + скрыть панель на success
    status: completed
  - id: d3-gate
    content: Unit + ci-pr + Acceptance + notify + закрыть план
    status: completed
isProject: false
---

# D3 — Поручение: статус vs POG, прогресс, скрытие success

Эталон: [ориентир-скорости-запросов-заказчика-2026-09-21.md](заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md).

## Запрос заказчика

Пока PDF поручения не сформирован — понятно, что ждут формирования; во время генерации виден прогресс; после готовности виджет генерации не мешает.

## Acceptance

Manager на заявке со статусом поручения и `pog idle`: не вводит в заблуждение «отправлено на подпись» без оговорки про формирование. При `pending` — индикатор прогресса. При `success` — панели «PDF поручения готов» нет.

## Вне scope

Смена доменных статусов в core; % прогресса с API (только indeterminate); D1–D2/D4–D6.

## Подход (зафиксирован)

Проекция badge/copy от `status` + `pogStatus` без смены машины статусов. Indeterminate progress в [`pog-status-panel.tsx`](vdp/fe/src/components/ved/pog-status-panel.tsx). При `success` — `return null`.

## Сверка с rules

`планирование-сверка-с-rules`, `интеграция-и-события` (UI ≠ источник истины статуса), `ui-web-практики`, `vdp-ci-local-gate`, `честность-готовности`, `plan-закрытие-и-dod`, `mgmt-tg-notify`.

## Слои

- UI/FE: status badge helper / form-detail + [`pog-status-panel.tsx`](vdp/fe/src/components/ved/pog-status-panel.tsx); при необходимости [`statuses.ts`](vdp/fe/src/lib/ved/statuses.ts) только для overlay-copy helper, не переименование канона
- Unit на проекцию idle/pending/success
- Gate: `ci-pr`

## Корнеры

success без `pogFileId`; failed + retry; double-click generate; export-ветки не ломать.

## DoD / QG

`check-env-parity` → unit → `ci-pr` → Acceptance → lead-time строка → notify done → закрыть план.
