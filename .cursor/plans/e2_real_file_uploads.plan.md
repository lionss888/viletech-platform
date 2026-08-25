---
name: E2 Real file uploads
overview: "Lifecycle CTA с файлами через upload в UI: requiresFileUpload в catalog, file picker в ActionBar, убрать обязательные seed stub ids с UI-пути."
todos:
  - id: e2-action-type
    content: BduiAction.requiresFileUpload + зеркало типов в bdui-client
    status: pending
  - id: e2-catalog
    content: Catalog file-CTA без обязательного stub staticBody на UI-пути
    status: pending
  - id: e2-action-bar
    content: ActionBar — file input → apiUploadFile → body field
    status: pending
  - id: e2-qa
    content: "QA gate E2: User/Manager/Provider PDF с диска; unit schema"
    status: pending
isProject: false
---

# E2 — Реальные файлы вместо stubs

## Зависимость

После зелёного **E1** (стенд поднимается, 5 login smoke).

## Цель

Lifecycle-действия с файлами выполняются через upload в UI, а не через фиксированные seed ObjectId в `staticBody`.

## Строгий критерий (вклад в DoD программы)

Оператор может **прикреплять PDF с диска** к заявке в UI (основа для проведения заявки по этапам без curl).

## Scope

- Расширить `BduiAction`: `requiresFileUpload?: { uploadPath; bodyField; accept? }` (массив полей при необходимости) — [`bdui.types.ts`](fe-experiment/backend-for-ved/src/modules/bdui/bdui.types.ts), зеркало [`bdui-client/src/types/bdui.ts`](fe-experiment/bdui-client/src/types/bdui.ts)
- Catalog: User/Manager/Provider file-CTA без обязательного seed file id в UI-пути — [`lifecycle-action.catalog.ts`](fe-experiment/backend-for-ved/src/modules/bdui/service/lifecycle-action.catalog.ts)
- Клиент: file input → `apiUploadFile` ([`client.ts`](fe-experiment/bdui-client/src/api/client.ts)) → подставить `_id` в body — [`ActionBarWidget.tsx`](fe-experiment/bdui-client/src/components/widgets/ActionBarWidget.tsx), [`ScreenPage.tsx`](fe-experiment/bdui-client/src/pages/ScreenPage.tsx)
- Покрыть CTA: upload contract / order / order-advance / payments / report / shipment; provider proof; manager contract attach / order attach / report-shipment где нужен file
- Seed stub ids — только seed/data и unit-тесты mapping, не единственный UI-путь
- NOTES: stub → upload; LIFECYCLE quality gate E2

## Вне

Diadoc, генерация шаблонов PDF с нуля, refund.

## Опора

- Wizard уже умеет upload PDF — [`WizardWidget.tsx`](fe-experiment/bdui-client/src/components/widgets/WizardWidget.tsx)
- Текущий merge `staticBody` — [`ScreenPage.tsx`](fe-experiment/bdui-client/src/pages/ScreenPage.tsx)

## Проверка стабильности и качества

1. Unit: actions с `requiresFileUpload` без жёсткого stub id в schema для UI-пути
2. Ручной: User загружает PDF поручения с диска → статус двигается
3. Manager и Provider — хотя бы по одному file-CTA с диска
4. Без выбранного файла CTA не уходит с пустым/чужим stub id
5. Самопроверка: upload path совпадает с существующим file API
