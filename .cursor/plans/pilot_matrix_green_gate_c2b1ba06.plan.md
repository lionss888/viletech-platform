---
name: Pilot matrix green gate
overview: "Гарантия green: свежий repro @pilot-matrix на текущем d2 (compose), починка оставшихся падений, make ci-pr-pilot, зелёный PR #36, затем разблокировка main (влить #35 или поглотить authPost и закрыть #35)."
todos:
  - id: inventory-head
    content: "Свежий @pilot-matrix на HEAD (compose): таблица fail-list"
    status: completed
  - id: fix-roots
    content: Чинить seed/direction/CTA/confirmModal по fail-list + unit
    status: completed
  - id: gate-ci-pr-pilot
    content: make check-env-parity + make ci-pr-pilot зелёный
    status: completed
  - id: pr36-github
    content: "Один push; VDP CI d2 green без cancel; merge #36"
    status: completed
  - id: unblock-main
    content: "authPost на main (через #36); закрыть #35; проверить browser E2E на main"
    status: completed
isProject: false
---

# План: green #36 + unblock main

## Зафиксированные решения

- DoD: **B** — зелёный PR [#36](https://github.com/lionss888/viletech-platform/pull/36) **и** разблокировка `main` (browser E2E / schedule).
- Repro: **локальный compose** (`make compose-up` + `make playwright-pilot-matrix` / точечный grep).
- Не опираться на лог CI [#104](https://github.com/lionss888/viletech-platform/actions/runs/35081431624) (SHA `895b0f03`): HEAD `ae17cda` уже без `loginAs("eco")`, с `PAY_FROM_EXPORT` и `export authPost`. Сначала **новый** список красных тестов на HEAD.

## Гарантия (что именно обещаем)

«Исправлено» = проверяемо:

1. Локально: `make check-env-parity` → затронутые unit → **`make ci-pr-pilot`** зелёный.
2. GitHub: один **не-cancelled** VDP CI на `d2` с зелёным `playwright (pilot-matrix)` (и остальными required).
3. `main`: после merge #36 **или** merge [#35](https://github.com/lionss888/viletech-platform/pull/35) — `export authPost` на default branch; следующий VDP CI на `main` (push/schedule) не падает на missing export при загрузке e2e.

Не обещаем: green без локального/CI прогона лестницы; «починили logout»; merge при cancelled checks.

## Слои

| Слой | Работа |
|---|---|
| E2E | Свежий список fail; assert direction/ошибки модалки; sync ролей seed |
| FE ActionPanel / manager-payment | Если CTA скрыта при верном `direction` — правка filter |
| FE bridge / API | Если модалка не закрывается — чинить failing action |
| Unit | Тесты на filter direction / confirm path при правке продукта |
| Domains | Только если transition/API отвергает легитимный шаг |
| Compose | `compose-up` + pilot-matrix |
| Docs/notify | Вне scope |

## Работы (порядок)

### 0. Стабильность сигнала

- Не пушить в `d2` поверх идущего VDP CI (`cancel-in-progress`).
- Один фикс-цикл → один push → ждать полный run.

### 1. Инвентарь на HEAD (обязателен)

```bash
cd vdp && make check-env-parity && make compose-up
# после health:
PLAYWRIGHT_ARGS='--grep @pilot-matrix' make playwright-e2e
# или: make playwright-pilot-matrix
```

Зафиксировать таблицу: spec → assertion → статус/роль/CTA. Только это — backlog фикса.

Ожидаемые классы (из #104, проверить заново):

- Export: нет «Сформировать поручение» при `form_accepted` → проверить `form.direction` в UI vs [hidesFormAcceptedActionForDirection](vdp/fe/src/lib/ved/manager-payment.ts); create уже шлёт `direction` + `PAY_FROM_EXPORT` в [pilot-matrix-export.spec.ts](vdp/fe/e2e/pilot-matrix-export.spec.ts).
- Full-ladder / postpay: `confirmModal` — `Подтвердить` остаётся visible → действие упало; усилить assert текстом ошибки в модалке, чинить API/мост.
- Refund `eco`: на HEAD уже нет — подтвердить отсутствием в fail-list.
- Logout timeout: не чинить; следствие confirmModal.

### 2. Фикс по корневым причинам (не timeouts)

По каждому красному из п.1:

1. **Seed/роль** — только валидные ключи из [app-seed-accounts.ts](vdp/fe/src/lib/ved/app-seed-accounts.ts); в `loginAs` fail-fast если seed undefined (чтобы не 420s).
2. **Export CTA** — если direction в DOM не export → баг create/mapper; если export, а кнопки нет → [ActionPanel.tsx](vdp/fe/src/components/ved/ActionPanel.tsx) / processRoles; клик по точному лейблу `Сформировать поручение` на `form_accepted`.
3. **Модалка** — в shared `confirmModal` при таймауте читать error text; чинить failing command (provider assign / coverage / attach / refund init).

Unit: при правке `hidesFormAccepted*` / bridge — обновить [manager-payment.test.ts](vdp/fe/src/lib/ved/manager-payment.test.ts).

### 3. Локальный gate

```bash
make check-env-parity
# fe unit затронутых файлов
make ci-pr-pilot
```

Красный `ci-pr-pilot` = не готово. Не подменять `ci-pr`.

### 4. PR #36

- Один push с фиксами.
- Дождаться VDP CI без cancel; `playwright (pilot-matrix)` success.
- Merge #36 только при полном green required.

### 5. Unblock main (трек B)

Порядок:

1. Если #36 уже содержит `export authPost` (да на `d2`) — после merge #36 в `main` PR #35 **закрыть как поглощённый**.
2. Если merge #36 задерживается, а schedule на main критичен — **слить #35 сейчас** (узкий E2E уже зелёный; pilot-matrix на #35 может остаться красным до #36 — это ок для цели «browser E2E на main не падает на import»). Предпочтение: **не плодить два merge**, сначала довести #36, затем закрыть #35.

Зафиксированный default: **сначала green #36 + merge в main, затем close #35**. Отдельный merge #35 только если #36 не мержится в том же календарном окне и main schedule блокирует ops.

### 6. Проверка main

После появления `export authPost` на `main`: убедиться по Actions, что `playwright (browser E2E)` на push/schedule не падает на missing export. Pilot-matrix на schedule обычно skip (нет PR path-filter) — этого достаточно для unblock smoke.

## QG / DoD

- [ ] `make check-env-parity`
- [ ] Unit на затронутый filter/bridge (если правили продукт)
- [ ] `make ci-pr-pilot` зелёный локально
- [ ] GitHub VDP CI на `d2`: pilot-matrix + остальные required green (не cancelled)
- [ ] `main` содержит `export authPost`; browser E2E на main не ломается на import
- [ ] #35 закрыт или смержен по правилу выше
- [ ] Не утверждать merge-ready без п.3–4

## Сверка с `.cursor/rules`

**Обязательны:** `планирование-сверка-с-rules`, `честность-готовности`, `vdp-ci-local-gate`, `тесты-архитектуры`, `playwright-e2e`, `use-cases`, `ui-web-практики` (CTA = матрица).

**Вне scope:** ML, `release-gate`, docker fe-refresh без спроса, Copilot-фиксы `networkidle` / fallback logout, расширение PR smoke до полной лестницы.

## Анти-паттерны

- Чинить по старому #104 без repro на HEAD.
- Увеличивать timeout / `goto /login` вместо причины.
- Push во время pilot-matrix → cancelled «3/9».
- Merge #36 при красном/cancelled pilot-matrix.
- Считать узкий browser E2E паритетом GitHub PR.
