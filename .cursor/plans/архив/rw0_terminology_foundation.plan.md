---
name: RW0 Terminology Foundation
overview: "Фундамент Role Wording: методология в .cursor/rules/методология/, архитектура FE copy-слоя, glossariy-по-ролям. Без правок root UI и без смены status/action id."
todos:
  - id: rw0-method-folder
    content: Подтвердить/дополнить .cursor/rules/методология/ (4 txt)
    status: pending
  - id: rw0-copy-arch
    content: Зафиксировать целевую структуру vdp/fe/src/lib/ved/copy/
    status: pending
  - id: rw0-glossary-draft
    content: Черновик glossariy-po-rolyam согласован с actions/statuses
    status: pending
  - id: rw0-gate
    content: "DoD: методология на месте; RW1 может стартовать; root не тронут"
    status: pending
isProject: false
---

# RW0 — Terminology foundation

## Meta
- **ID:** RW0
- **Группа:** Методология / Infra копирайта
- **Зависимости:** —
- **Оценка:** 0.5–1 день
- **Не трогаем:** root/superadmin UI; demo; status/action id в core

## Scope
**In:** конспект PDF, ссылки на реестры, глоссарий по ролям, решение по FE copy-слою.
**Out:** смена формулировок в UI (это RW1+); отладка функциональности (RD*); Playwright.

## Rules gate
- [`ui-web-практики`](.cursor/rules/ui-web-практики.mdc) — один термин на сущность в кабинете
- [`интеграция-и-события`](.cursor/rules/интеграция-и-события.mdc) — UI = проекция
- [`безопасность-ролей-и-данных`](.cursor/rules/безопасность-ролей-и-данных.mdc) — provider без ПДн в copy
- [`планирование-сверка-с-rules`](.cursor/rules/планирование-сверка-с-rules.mdc)

## Артефакты методологии
```
.cursor/rules/методология/
  osnovy-ved-konspekt.txt
  terminologiya-ved.txt
  istochniki-i-ssylki.txt
  glossariy-po-rolyam.txt
```
Ссылки: [ved.gov.ru](https://ved.gov.ru/#/), [minfin registry](https://minfin.gov.ru/ru/opendata/registry/), [cbr infrastr](https://cbr.ru/registries/infrastr/), [ФТС ТН ВЭД](https://customs.gov.ru/uchastnikam-ved/spravochnaya-informacziya/tovarnaya-nomenklatura-%28tn-ved-eaes-i-tn-ved-sng%29).

## Техническая цель FE (исполнение в RW1+)
Целевой слой: `vdp/fe/src/lib/ved/copy/` — `status-labels.ts`, `action-labels.ts`, `nav-labels.ts`, `role-voice.ts`.
Потребители: [`actions.ts`](vdp/fe/src/lib/ved/actions.ts), [`statuses.ts`](vdp/fe/src/lib/ved/statuses.ts), [`nav-config.ts`](vdp/fe/src/lib/ved/nav-config.ts), [`dashboard-page.tsx`](vdp/fe/src/components/ved/pages/dashboard-page.tsx), SubjectReview.

## Решение role-aware labels
Labels могут зависеть от `VedRole` при чтении статуса/CTA; канонический id не меняется. Root не получает отдельный voice в RW*.

## DoD
- [ ] Папка методологии с 4 файлами
- [ ] Glossariy-po-ролям заполнен черновиком
- [ ] Архитектура copy/ зафиксирована здесь и в master
- [ ] Root UI не изменён

## Bug / change template
| Поле | Пример |
|------|--------|
| Role | user |
| Canon | draft |
| Current label | Черновик |
| Proposed | Черновик заявки |
| Source | glossariy / ved.gov.ru |
| Layer | copy |
| Fix PR | … |
