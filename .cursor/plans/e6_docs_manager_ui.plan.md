---
name: E6 Docs manager UI
overview: "Документы и менеджерский контур в UI: contract/order/report с диска, mgr_contract_attach с file+number+date, advance-order E2E; финальный DoD программы UI readiness = 100%."
todos:
  - id: e6-user-docs
    content: User — договор/поручение/отчёт с диска на detail CTA
    status: pending
  - id: e6-mgr-contract
    content: Manager mgr_contract_attach — file + number/date в UI
    status: pending
  - id: e6-advance-order
    content: Advance-order UI end-to-end (signing → upload → accept)
    status: pending
  - id: e6-qa
    content: "QA gate E6: артефакты UI + финальный DoD программы (5 пунктов)"
    status: pending
isProject: false
---

# E6 — Документы и менеджерский контур

## Зависимость

После зелёного **E5** (кабинеты ролей проходимы руками).

## Цель

Договор / поручение / отчёт — артефакты в UI, не только статусные кнопки; закрыть программу UI readiness до **100%** относительно образа результата.

## Строгий критерий (полный DoD программы)

Оператор без Swagger/curl может:

1. Поднять стенд по инструкции/скрипту.
2. Залогиниться под каждой из 5 ролей ВИ.
3. Создать заявку и провести её по всему каноническому lifecycle до `COMPLETED` только через UI.
4. В UI пройти corrections, cancel и postpay до `COMPLETED`.
5. Работать с заявками: список → карточка → CTA по статусу для каждой роли.

Плюс на E6: менеджер прикрепляет договор файлом; user видит артефакты; advance-order один раз в UI.

## Scope

- User: загрузка подписанного договора / поручения / отчёта с диска (добить остаток E2, если что-то отложено)
- Manager: `mgr_contract_attach` с file picker + number/date в UI (prompt или компактная form), без ручной подстановки seed ObjectId
- Advance-order: UI E2E на postpay/advance (signing → user upload → accept)
- Hints «скачать / подписать / загрузить» в schema; `order/generate` где API есть; S3-сбой → явный fallback message, не молчаливый stub
- LIFECYCLE: E6 DONE + итоговый DoD чеклист; NOTES — закрытые gaps по документам UI

## Вне программы 100%

Diadoc, шаблоны по ПА, субагент/услуги, refund, Bank API, Admin/Superadmin — отдельный эпик.

## Опора

- Catalog attach: [`lifecycle-action.catalog.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/lifecycle-action.catalog.ts)
- Seed ids / contract: [`NOTES.md`](fe-experiment/NOTES.md), [`bdui.constants.ts`](fe-experiment/backend-for-ved/src/modules/bdui/bdui.constants.ts)
- ВИ документы: [`вводные/вводные от ви.txt`](вводные/вводные%20от%20ви.txt) (поля — упрощённо в BDUI, не полный конструктор)

## Проверка стабильности и качества

1. Manager прикрепляет договор файлом в UI → заявка уходит к поручению
2. User видит наличие договора/поручения на detail (поля/hint)
3. Advance-order цикл в UI один раз
4. Финальный приёмочный прогон полного DoD (5 пунктов) — зелёный
5. Самопроверка: после E6 заявленный образ результата = 100%; FigJam-расширения вне scope зафиксированы в NOTES
