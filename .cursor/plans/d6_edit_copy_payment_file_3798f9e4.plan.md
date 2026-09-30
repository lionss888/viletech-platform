---
name: D6 edit copy payment file
overview: "Срез D6: честный copy «Редактировать заявку» + «Платёж отправлен» с прикреплением файла (#3A, #15). Gate ci-pr-pilot."
todos:
  - id: d6-edit-copy
    content: Честный copy FormParamsEditDialog
    status: pending
  - id: d6-payment-file
    content: Платёж отправлен с requiresFile / filechooser
    status: pending
  - id: d6-gate
    content: Unit+E2E + ci-pr-pilot + Acceptance + notify + закрыть план
    status: pending
isProject: false
---

# D6 — Edit copy + платёж отправлен с файлом

Эталон: [ориентир-скорости-запросов-заказчика-2026-09-21.md](заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md).

## Запрос заказчика

В «Редактировать заявку» нет ложного обещания блока документов; провайдер при «Платёж отправлен» прикрепляет подтверждение в том же жесте.

## Acceptance

Manager/User открывает edit → текст не обещает «документы в блоке ниже» без блока (заменить на ссылку к документам карточки или убрать фразу). Provider → «Платёж отправлен» → filechooser → подтверждение уходит с файлом; отдельная обязательная первая кнопка «Прикрепить подтверждение» не требуется для happy-path.

## Вне scope

Полный upload/delete внутри edit (#3B); OCR lifecycle в review (#5); D7+.

## Подход (зафиксирован)

1. Copy в [`FormParamsEditDialog.tsx`](vdp/fe/src/components/ved/FormParamsEditDialog.tsx).
2. `prov_payment_sent` в ActionPanel: modal с `requiresFile` (общий жест с attach), убрать/свернуть отдельный обязательный attach-first; соблюсти [`fe-interaction-contracts`](.cursor/rules/fe-interaction-contracts.mdc).

## Сверка с rules

`fe-interaction-contracts`, `playwright-e2e`, `ui-web-практики`, `честность-готовности`, `vdp-ci-local-gate` (**ci-pr-pilot**), `plan-закрытие-и-dod`, `mgmt-tg-notify`.

## Слои

- FE dialog copy + ActionPanel/actions bridge
- Unit + gesture E2E (filechooser) на payment sent
- Gate: `make ci-pr-pilot`

## Корнеры

Sent без файла — blocked; повтор/идемпотентность; demo vs app.

## DoD / QG

`check-env-parity` → unit + gesture E2E → `ci-pr-pilot` → Acceptance → lead-time → notify → закрыть план.
