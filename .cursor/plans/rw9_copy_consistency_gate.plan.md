---
name: RW9 Copy Consistency Gate
overview: Сквозная проверка согласованности терминов между ролями после RW1–RW8. Unit на copy helpers. Root не трогаем.
todos:
  - id: rw9-cross-role
    content: Пройти User→completed и сверить labels между кабинетами
    status: completed
  - id: rw9-glossary-sync
    content: Синхронизировать glossariy-po-rolyam с финальными labels
    status: completed
  - id: rw9-tests
    content: npm test на copy helpers / role-voice
    status: completed
  - id: rw9-gate
    content: "DoD: нет конфликтов терминов P0; root не тронут"
    status: completed
isProject: false
---

# RW9 — Copy consistency gate

## Meta
- **ID:** RW9 · **Группа:** Финал копирайта · **Зависимости:** RW1–RW8 · **Оценка:** 0.5–1 день
- **Связь с RD:** перед или вместе с RD10

## Scope
**In:** сверка одного термина на сущность между кабинетами; обновление глоссария; тесты copy-слоя.
**Out:** новые фичи; root wording; Playwright (RD11).

## Rules gate
ui-web-практики (один термин), тесты-архитектуры, правила-построения, поддержка-и-обратная-связь.

## Checklist
- [ ] Сквозной UI: User → ICO → ECO → Manager → Provider — labels не противоречат
- [ ] «Заявка» vs «сделка» — зафиксировано per-role в глоссарии
- [ ] Provider без ПДн-copy
- [ ] Ссылки/tooltips источников (ФТС/ЦБ) где добавлены — корректны
- [ ] `npm test` green
- [ ] **Root UI без изменений**

## DoD
- [ ] RW1–RW8 закрыты или явный defer
- [ ] glossariy-po-rolyam актуален
- [ ] Нет P0 copy-конфликтов перед RD10
