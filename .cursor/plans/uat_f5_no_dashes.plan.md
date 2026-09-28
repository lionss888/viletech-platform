---
name: UAT F5 no dashes
overview: "Пункт 5: убрать прочерки «—» как empty-state для всех ролей/участников; единый паттерн «не указано» / omit через presentValue; добить providerPaymentRequisites и сырые UUID где каталог есть."
todos:
  - id: f5-audit
    content: "Аудит FE: литералы «—» в карточке/реестрах/provider-acl/mappers"
    status: pending
  - id: f5-fix
    content: "providerPaymentRequisites + остатки → presentValue / «не указано»; имена org/CP не UUID при наличии каталога"
    status: pending
  - id: f5-tests
    content: Unit party-requisites/provider-acl; spot E2E или component assert
    status: pending
  - id: f5-qg
    content: check-env-parity → ci-pr; close DoD + notify
    status: pending
isProject: false
---

# UAT F5: без прочерков empty-state

## Источник

Блок «Реквизиты платежа (без ПДн клиента)»: ИНН / страна / банк / SWIFT = `—`; org/CP иногда как UUID. Правило: прочерки **не используем** для пустых полей у всех ролей и участников.

## Решение (зафиксировано)

Empty = фраза **«не указано»** / поле-специфичная («Юридический адрес не указан») через [party-requisites.ts](vdp/fe/src/lib/ved/party-requisites.ts) `presentValue`; не скрывать обязательные для платежа поля молча. Имена org/CP — из каталога, не сырой id, если запись доступна.

## Вердикт по коду

- Участники/факты частично уже на `presentValue` + «не указан» в [form-detail-page.tsx](vdp/fe/src/components/ved/pages/form-detail-page.tsx).
- Дыра: [provider-acl.ts](vdp/fe/src/lib/ved/provider-acl.ts) `providerPaymentRequisites` — fallback `"—"`.
- Возможны остатки в catalog-mappers / wizard seed — пройти аудит.

## Цель

Ни один блок карточки заявки (все роли) не показывает `—` / `-` как значение пустого поля.

## Scope

- Аудит литералов прочерка на карточке и связанных helperах.
- Выровнять provider requisites и прочие остатки на `presentValue`.
- Unit на helper; регрессия имён vs UUID при loaded catalog.

## Вне scope

- Выдумывать отсутствующие банк/SWIFT в данных.
- Массовый рефакторинг demo mock seed (кроме путей, видимых в app-карточке).

## Слои

- UI: отображение реквизитов/участников.
- FE: provider-acl, party-requisites, form-detail, mappers при необходимости.
- Домен/API: без изменений.
- Unit (+ точечный e2e при нужде).
- Compose localhost spot.
- notify + handoff sync.

## Rules

**Обязательны:** `планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `честность-готовности`, `ui-web-практики`, `безопасность-ролей-и-данных` (Provider без ПДн — не добавлять ПДн ради заполнения), `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

## DoD / QG

- [ ] Аудит закрыт; provider block без `—`
- [ ] `make check-env-parity`
- [ ] Unit
- [ ] `make ci-pr`
- [ ] DoD/todos; sync-handoff-queue; notify-mgmt

## Accept

- Пустые ИНН/страна/банк/SWIFT → «не указано» (или эквивалент), не прочерк.
- Org/CP с известным именем — имя, не UUID.
- Provider-блок по-прежнему без ПДн клиента.
