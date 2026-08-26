---
name: W3 FE Domain Actions
overview: "CTA = use case command в core; ActionPanel без nextStatus-истины. Gate: ≥1 переход + явный % матрицы."
todos:
  - id: w3-app-actions
    content: app-actions.ts роль×статус → coreAction (use case id)
    status: pending
  - id: w3-panel
    content: ActionPanel primary CTA + confirm destructive; invalidate
    status: pending
  - id: w3-map-test
    content: Table-driven FE→domain action + запрет чужой роли (ожидание 403)
    status: pending
  - id: w3-gate
    content: "Gate: POST action меняет status; указать N/M покрытых статусов"
    status: pending
isProject: false
---

# W3: Domain actions

## Цель

Кнопки шлют **команды use case** в core; FE — Humble Object ([`чистая-архитектура`](.cursor/rules/чистая-архитектура.mdc)).

## Якоря

- `POST /api/v1/forms/{id}/actions/{action}`; [`actions.go`](vdp/core/internal/domain/formpayment/actions.go); demo [`actions.ts`](vdp/fe/src/lib/ved/actions.ts) только как справочник лейблов

## Правила

- [`use-cases`](.cursor/rules/use-cases.mdc) — одно CTA ≈ одно намерение; ошибка недопустимого перехода/роли — явная
- [`интеграция-и-события`](.cursor/rules/интеграция-и-события.mdc) — UI не оркестратор; допустимые действия из матрицы роли, не выдуманный nextStatus
- [`детали-как-плагины`](.cursor/rules/детали-как-плагины.mdc) — запрет «статус только во frontend»
- [`безопасность-ролей-и-данных`](.cursor/rules/безопасность-ролей-и-данных.mdc) — 403 → UI; нет client bypass
- [`ui-web-практики`](.cursor/rules/ui-web-практики.mdc) — один primary CTA; destructive отдельно + confirm
- [`правила-построения`](.cursor/rules/правила-построения.mdc) — после action проверить статус; тест маппинга
- [`тесты-архитектуры`](.cursor/rules/тесты-архитектуры.mdc) — unit на маппинг; не дублировать всю SM в Playwright
- [`устойчивость-и-наблюдаемость`](.cursor/rules/устойчивость-и-наблюдаемость.mdc) — ошибка не патчит статус «вперёд» локально
- DoD-дисциплина: partial matrix = явный **N/M** статусов с CTA

## Работы

1. `lib/ved/app-actions.ts`: `{ label, tone, requiresReason?, coreAction }` — **без** `nextStatus` как истины.
2. Gate-минимум: `submit` + ≥1 compliance/manager action; расширять без claim полноты.
3. App ActionPanel → `transition` → invalidate; статус из response.
4. `requiresReason` + confirm для danger; reason в core body — если API ещё не принимает, UI всё равно требует ввод (не блокирует DoD перехода).
5. Demo matrix с `nextStatus` не ломать.

## DoD

- ≥1 успешный POST; GET показывает новый status.
- Чужая роль/запрет → ошибка, локальный status не «успевает».
- Table-driven mapping test зелёный.
- В gate: доля покрытия матрицы статусов (N/M), не «полный lifecycle».

## Вне scope

File upload в action, Nest PUT paths, полный E2E всех ролей.

## Gate

«W3 done — use-case actions (matrix N/M); create = W4».
