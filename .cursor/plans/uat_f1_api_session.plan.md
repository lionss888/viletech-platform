---
name: UAT F1 API session
overview: "Пункт 1 UAT 2026-09-27: разобрать и починить продуктовую часть сбоев API на карточке (401 upload/фоновые, шум 403, UX 409 submit) после живого repro на localhost; чистый ops alpha — вне scope."
todos:
  - id: f1-queue
    content: Поставить F1–F7 в handoff queue + sync-handoff-queue (старт волны)
    status: completed
  - id: f1-repro
    content: Localhost repro F1a/b/c; классификация product vs alpha-only
    status: completed
  - id: f1-fix-auth-noise
    content: "Фикс product: 401 upload/session, шум admin/account, UX 409 submit"
    status: completed
  - id: f1-tests-gate
    content: Unit (+ e2e по path) → check-env-parity → ci-pr / ci-pr-pilot / ci-main
    status: completed
  - id: f1-close
    content: Журнал + DoD/todos completed + notify-mgmt + sync-handoff-queue
    status: completed
isProject: false
---

# UAT F1: API / session / submit errors

## Источник

Ручной тест alpha 2026-09-27: клиент `POST …/actions/submit` → **409**; менеджер — **401** (`process-roles`, `diadoc-status`, …) и **403** (`admin/account`, `counterparty/…`); клиент upload поручения → **Upload failed** / **401** `file-store/upload`.

## Вердикт по коду (старт)

- Submit **409** в core часто = illegal transition / conflict (`r1_formpayment_test.go`), не `guardBeforeApply` для `submit` (invoice guard — только ECO/manager accept).
- FE на карточке показывает сырой `ApiError` в [ActionPanel.tsx](vdp/fe/src/components/ved/ActionPanel.tsx); отдельного UX для 409 нет.
- Upload 401 при живой сессии = кандидат на истекший JWT / отсутствие reauth на file-store path.
- `GET admin/account` от менеджера — ожидаемый 403; шум = лишние вызовы FE, не «сломанная заявка».
- `GET counterparty` для manager в текущем [docs.go `canReadCounterparty`](vdp/core/internal/service/docs.go) разрешён — 403 на alpha может быть drift деплоя или неверный principal; сначала localhost.

## Цель

После localhost repro: (1) upload и фоновые вызовы с валидной сессией не сыплют 401; (2) FE не долбит запрещённые endpoint’ы роли; (3) 409/ошибка submit понятна в UI (текст + не silent).

## Scope

- Живой repro localhost (app, seed) по сценариям F1a/b/c; зафиксировать Network/DOM.
- Классификация: product bug vs alpha-only; alpha-only → запись в журнал, не «чинить деплой» в этом плане.
- Product: auth/session на upload + критичных GETs; убрать/загейтить `admin/account` вне root; человекочитаемый conflict на submit в ActionPanel.
- Unit/E2E на затронутый helper/путь.

## Вне scope

- Чистый ops/redeploy alpha без локального бага.
- F2 (disabled submit без документов) — отдельный план.
- F3 (verify CP) — отдельный план (но 403 CP может быть общим корнем — зафиксировать связь в журнале).

## Слои

- UI: сообщение ошибки submit/upload; disabled/reauth UX при 401.
- FE: auth client / query hooks, ActionPanel error mapping, вызовы `admin/account` / process-roles.
- Домен/API: только если localhost докажет AuthZ/transition баг (не ослаблять политику ради UX).
- Unit: маппинг 409/401 → copy; guard вызовов по роли.
- E2E: при правке upload/session — gesture или login→action smoke; иначе unit + manual repro.
- Compose: localhost до «готово» (`ui-проблема-сразу-воспроизведи`).
- Docs/handoff: журнал findings; `queue.json` + `make -C vdp sync-handoff-queue` при постановке волны; `notify-mgmt` при закрытии.

## Rules

**Обязательны:** `планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `честность-готовности`, `ui-проблема-сразу-воспроизведи`, `ui-web-практики`, `безопасность-ролей-и-данных`, `интеграция-и-события`, `устойчивость-и-наблюдаемость`, `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate`, `mgmt-tg-notify`, `правила-построения`.

**Вне scope rules:** ML, serverless, Nest modules.

## DoD / QG

- [x] Localhost repro F1a/b/c с доказательствами (до и после)
- [x] `make check-env-parity`
- [x] Unit по затронутому
- [x] Gate: `make ci-pr-pilot` (ActionPanel + domain)
- [x] Журнал: product vs alpha-only; связь с F3 при 403 CP — `заметки/uat-f1-api-session-2026-09-27.md`
- [x] Todos + DoD; sync-handoff-queue; notify-mgmt

## Accept

- С валидной сессией upload поручения не падает 401 на localhost (refresh на multipart).
- Менеджер на карточке не получает шквал ожидаемых 403 от `admin/account` (нет лишних вызовов).
- Submit conflict → понятный текст в UI; submit из `creating` проходит.
- Merge-ready: `ci-pr-pilot` green.
