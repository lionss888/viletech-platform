---
name: D5 modal sizes types
overview: "Срез D5: типы размеров Modal и truncate длинных имён файлов (#8). Gate ci-pr."
todos:
  - id: d5-impl
    content: Modal size sm|md|lg + truncate filename + маппинг upload-confirm
    status: pending
  - id: d5-gate
    content: Unit + ci-pr + Acceptance + notify + закрыть план
    status: pending
isProject: false
---

# D5 — Типы размеров диалогов

Эталон: [ориентир-скорости-запросов-заказчика-2026-09-21.md](заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md).

## Запрос заказчика

Диалог загрузки/подтверждения (напр. «Загрузить подписанное поручение») не обрезает кнопку подтверждения и длинное имя файла.

## Acceptance

User/Manager открывает upload-confirm с длинным filename → видна полная кнопка подтверждения; имя файла читаемо truncated (не ломает layout).

## Вне scope

Полный редизайн всех модалок; OCR review layout beyond size token.

## Подход (зафиксирован)

В [`Modal.tsx`](vdp/fe/src/components/ved/Modal.tsx) ввести размер `sm | md | lg` (маппинг: confirm→sm/md, form→md, upload→lg). Заменить boolean `wide`. Truncate filename в зоне файла ActionPanel/FilePick. Обновить вызовы upload-confirm модалок.

## Сверка с rules

`ui-web-практики`, `fe-interaction-contracts` (не ломать file gesture), `vdp-ci-local-gate`, `plan-закрытие-и-dod`, `mgmt-tg-notify`.

## Слои

- FE Modal + ActionPanel upload modals
- Unit/smoke на className size
- Gate: `ci-pr`

## Корнеры

mobile `max-w-[calc(100vw-2rem)]`; OCR review на `lg`; demo modals.

## DoD / QG

`check-env-parity` → unit → `ci-pr` → Acceptance → lead-time → notify → закрыть план.
