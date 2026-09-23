---
name: UAT W6 UI кабинеты ролей
overview: "Закрыть живой браузерный UAT кабинетов Manager / ICO / ECO / Provider / Root (и Treasurer spot) — очередь, карточка, CTA, AuthZ-проекция. Не подменять API-only."
todos:
  - id: w6-mgr-continuity
    content: "Browser: manager@ login → очередь → approve/reject continuity на заявке User"
    status: pending
  - id: w6-ico-eco
    content: "Browser: ico@ / eco@ (или continuity note) org/form review; зафиксировать F8 если slot off"
    status: pending
  - id: w6-provider-acl
    content: "Browser: provider@ карточка без колонки Клиент/ПДн; accept/execute/confirm CTA"
    status: pending
  - id: w6-root-cancel
    content: "Browser: root@ cancel draft/card по канону (согласовать с W5 path)"
    status: pending
  - id: w6-treasurer-spot
    content: "Browser: treasurer@ confirm на import advance payment_received (awaits-treasurer)"
    status: pending
  - id: w6-findings-waves
    content: "Новые findings → журнал; при багах — отдельные волны или дописать W4/W5"
    status: pending
  - id: w6-gate
    content: "check-env-parity; при новых e2e вне smoke → ci-main; иначе ci-pr-pilot если @pilot-matrix"
    status: pending
isProject: false
---

# UAT Волна 6: браузерные кабинеты ролей

## Источник

Остаток сессии 2026-09-23: UI Manager / ICO / ECO / Provider / Root не прогнан в браузере (auto-review). API spine/ACL уже зелёные — **не считать UI закрытым**. Журнал: `заметки/uat-кабинеты-feedback-2026-09-23.md`.

## Acceptance

1. Live repro на `http://localhost:5173` (app, не demo) под seed `*@vdp.local`.
2. **Manager:** видит заявку в очереди после User submit; continuity approve и reject → ожидаемые статусы; guided next step без выдуманных CTA.
3. **ICO / ECO:** либо прямой кабинет review, либо явное note «slot off → continuity manager» (F8) без ложного «сломан ECO».
4. **Provider:** реестр/карточка **без ПДн клиента**; действия accept / start / sent доступны по матрице.
5. **Root:** отмена черновика/заявки через UI, согласованная с каноном W5 (`manager/.../cancel` vs `root_cancel_form`).
6. **Treasurer (spot):** на import advance `payment_received` виден блок/CTA подтверждения покрытия.
7. Каждый UI-баг = finding с evidence (скрин/DOM) → волна или дописка в W2–W5.

## Вне scope

- Продуктовый фикс OCR (W1), org hygiene (W2), no_docs gate (W3), labels (W4) — только ловить регрессии.
- Смена статусной машины / auto-pay.
- Полный browser matrix all statuses × roles (честно вне DoD одной волны).

## Сверка с `.cursor/rules`

**Обязательны:** `планирование-сверка-с-rules`, `базовые-правила-инструмента`, `честность-готовности`, `ui-проблема-сразу-воспроизведи` (сначала браузер), `ui-web-практики` (top tasks ролей, один primary, «следующий шаг» = матрица), `ux-*`, `use-cases`, `безопасность-ролей-и-данных` (Provider без ПДн; AuthZ не только UI), `интеграция-и-события` (UI = проекция), `playwright-e2e`, `тесты-архитектуры`, `fe-platform-mounts` (если карточка manager), `vdp-ci-local-gate`, `mgmt-tg-notify` при закрытии волны с фиксом.

**Вне scope волны:** `машинное-обучение` (кроме наблюдения OCR на чужих экранах), serverless, ML train.

**Gate:** `make check-env-parity` → живой repro → при добавлении/правке e2e ролей вне PR-smoke → **`make ci-main`**; если только `@pilot-matrix` paths → **`make ci-pr-pilot`**. Не утверждать «UI кабинеты ок» без браузера.

## Слои

| Слой | Действие |
|---|---|
| UI / IA | Очередь → карточка → ActionPanel по роли; empty/disabled reason |
| FE | form-detail, ActionPanel, provider list columns; без смены домена |
| Домен | не менять матрицу; сверять CTA с app-actions / status |
| API | seed форм через helpers (как e2e); без новых endpoint |
| Unit | только если найден баг копирайта/ACL helper |
| E2E | расширить/добавить gesture specs ролей; не только API seed |
| Compose | localhost 5173 + healthy core |
| Docs / notify | журнал UAT; notify только после закрытия волны с продуктовым смыслом |

## Порядок исполнения

1. Seed: User form accepted / payment_received / provider processing (API helpers).
2. Browser manager continuity + reject.
3. Provider ACL visual + CTA.
4. ICO/ECO или зафиксировать continuity.
5. Root cancel UI ↔ W5.
6. Treasurer spot.
7. Сводка findings → волны.

## DoD / QG

1. `make check-env-parity`
2. Все роли из Acceptance имеют запись в журнале (OK или finding id)
3. Provider no-PII доказан скрином/DOM, не только API
4. Заявленный gate зелёный, если правили e2e/FE
5. Не писать «кабинеты 100%» — только закрытый scope волны
