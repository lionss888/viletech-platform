---
name: UAT F4 delete confirm
overview: "Пункт 4: страхующий диалог перед удалением документа на карточке заявки — защита от случайного клика «Удалить»."
todos:
  - id: f4-repro
    content: Localhost: клик Удалить без confirm (baseline)
    status: pending
  - id: f4-dialog
    content: "Confirm modal (паттерн RegistryManager) в DocumentList / form-detail"
    status: pending
  - id: f4-tests
    content: Unit/E2E — cancel не удаляет; confirm удаляет
    status: pending
  - id: f4-qg
    content: check-env-parity → ci-pr (или ci-main при новом e2e); close DoD + notify
    status: pending
isProject: false
---

# UAT F4: confirm перед удалением документа

## Источник

Список документов на карточке: «Удалить» срабатывает сразу. Нужен страхующий диалог.

## Вердикт по коду

- [DocumentViewer.tsx](vdp/fe/src/components/ved/DocumentViewer.tsx) `DocumentList` — `onDelete(d)` напрямую.
- Референс confirm: [RegistryManager.tsx](vdp/fe/src/components/ved/RegistryManager.tsx) («Удалить запись?»).
- Wire: [form-detail-page.tsx](vdp/fe/src/components/ved/pages/form-detail-page.tsx) при `canDeleteDocs`.

## Цель

Клик «Удалить» → модалка («Удалить документ …?» / Отмена · Удалить); удаление только после confirm.

## Scope

- Confirm dialog на delete в списке документов карточки (app).
- Копирайт с именем файла.
- Unit/E2E: cancel сохраняет документ; confirm вызывает delete.

## Вне scope

- Смена AuthZ delete / восстановление удалённых.
- Demo-only пути без app API (если delete в app недоступен — план фиксирует факт в Accept после repro).

## Слои

- UI: Modal confirm.
- FE: DocumentViewer + form-detail handler.
- API/домен: без изменений контракта delete.
- Unit + E2E.
- Compose localhost.
- notify + handoff sync при закрытии.

## Rules

**Обязательны:** `планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `честность-готовности`, `ui-проблема-сразу-воспроизведи`, `ui-web-практики` (irreversible confirm), `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

## DoD / QG

- [ ] Localhost: диалог появляется; Отмена не удаляет
- [ ] `make check-env-parity`
- [ ] Unit + e2e
- [ ] Gate: `make ci-pr`; новый e2e вне smoke → `make ci-main`
- [ ] DoD/todos; sync-handoff-queue; notify-mgmt

## Accept

- Без confirm документ не удаляется.
- Confirm удаляет один выбранный документ.
- Destructive CTA визуально отделён (как сейчас red «Удалить»).
