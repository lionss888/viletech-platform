---
name: R3 Contracts PA
overview: "Договоры §1–2 расширения: 3 типа, шаблоны по ПА, ручная загрузка менеджером с авто-confirm, поле «орг. от имени»."
todos:
  - id: r3-model
    content: Contract entity + migrations + statuses
    status: pending
  - id: r3-templates
    content: Templates per payment agent
    status: pending
  - id: r3-manual
    content: Manager manual attach + auto-confirm
    status: pending
  - id: r3-onbehalf
    content: On-behalf org field + tests
    status: pending
isProject: false
---

# R3: Contracts + Платёжный агент

## Цель

Модель Contract и ветки CONTRACT_* по [`расширение вводных.txt`](вводные/расширение%20вводных.txt) §1–2; Nest `contract` module как поведение API.

## Правила

AuthZ Manager/User/Admin; аудит uploadedBy; Provider без ПДн; статусы только через core SM.

## Работы

1. Сущность Contract: type (agency|subagency|services), agentId, templateId, status, uploadedBy, accountRef (услуги), history.
2. Шаблоны привязаны к agent (ПА); после выбора ПА клиенту отдаётся нужный шаблон.
3. Ветки: CONTRACT_WAITING / VERIFICATION / WAITING_CORRECTION → поручение.
4. API «Прикрепить договор вручную» + авто-confirm (§2).
5. Поле заявки onBehalfOrganizationId + видимость по типу договора.
6. Admin: смена типа договора; история на карточке орг.
7. Тесты: три типа; manual attach; on-behalf validation.

## DoD

Чеклист расширения §9 пункты 1–4 = done. Nest contract controllers mapped. `go test` green.

## Вне scope

Multi-order ADVANCE (R5); Bank (R10).
