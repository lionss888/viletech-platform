---
name: UAT W7 browser ladders + return
overview: "Закрыть браузерные денежные лестницы postpay / export / refund / shipment и return-episode. API уже зелёный — DoD = Playwright @pilot-matrix + live geste, не повтор API-only."
todos:
  - id: w7-postpay-browser
    content: "Прогон pilot-matrix-postpay-rate (или live) до completed / rate UI"
    status: pending
  - id: w7-export-browser
    content: "Прогон pilot-matrix-export treasurer PAY_FROM_EXPORT до completed"
    status: pending
  - id: w7-refund-browser
    content: "Прогон pilot-matrix-refund happy + stop/cancel"
    status: pending
  - id: w7-shipment-browser
    content: "Прогон pilot-matrix-shipment optional branch"
    status: pending
  - id: w7-return-episode
    content: "Прогон return-episode-e2e-journeys (или stage specs) + запись в журнал"
    status: pending
  - id: w7-full-ladder
    content: "Spot: pilot-matrix-full-ladder import advance + treasurer"
    status: pending
  - id: w7-gate
    content: "check-env-parity → make ci-pr-pilot (или targeted playwright-pilot-matrix); ci-main если новые e2e вне smoke"
    status: pending
isProject: false
---

# UAT Волна 7: браузерные лестницы + return

## Источник

Остаток сессии 2026-09-23: лестницы postpay / export / refund / shipment / return закрыты **API**, не UI. Честность: API ≠ готовность кабинетов (`честность-готовности`, `ui-проблема-сразу-воспроизведи`).

Канон specs: `vdp/fe/e2e/pilot-matrix-*.spec.ts`, `return-episode-*.spec.ts`.  
Команда: из `vdp` — `make playwright-pilot-matrix` / `make ci-pr-pilot`.

## Acceptance

1. **POSTPAY_RATE_ON_PP:** browser ladder (manager rate/commission после ПП) без `awaits-treasurer` там, где матрица запрещает.
2. **Export PAY_FROM_EXPORT:** browser до `completed` через treasurer UI.
3. **Refund:** init → processing → sent; stop/cancel ветка из matrix.
4. **Shipment:** optional branch с upload жестом (`filechooser` где есть upload).
5. **Return-episode:** хотя бы happy journey из `return-episode-e2e-journeys` зелёный или finding с repro.
6. **Import advance full-ladder (spot):** treasurer confirm + provider + report completed в браузере.
7. Красный spec → finding + волна фикса (не «пропустить, API же ок»).

## Вне scope

- POSTPAY_FIXED_RATE, продукт логистов beyond shipment branch.
- Смена доменной машины ради зелёного e2e.
- OCR product fix (W1); UI кабинетов ролей без лестниц (W6).

## Сверка с `.cursor/rules`

**Обязательны:** `планирование-сверка-с-rules`, `честность-готовности`, `ui-проблема-сразу-воспроизведи`, `ui-web-практики`, `use-cases`, `безопасность-ролей-и-данных` (treasurer/manager AuthZ), `интеграция-и-события`, `fe-interaction-contracts` (upload на shipment/return), `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate` (**ci-pr-pilot** для `@pilot-matrix`), `mgmt-tg-notify` при закрытии волны с фиксом.

**Вне scope:** ML auto-pay, chem/bio, shared DB.

**Gate:** `make check-env-parity` → targeted `@pilot-matrix` / return specs → **`make ci-pr-pilot`**. Новые e2e вне узкого PR-smoke и вне pilot tag → дополнительно **`make ci-main`**. Не закрывать волну зелёным только `ci-pr` / `ci-pr-fast`.

## Слои

| Слой | Действие |
|---|---|
| UI | ActionPanel / RefundPanel / ShipmentPanel / rate UI по статусу |
| FE | только при fail: копирайт CTA, disabled reason, mounts |
| Домен | без ослабления переходов; fail = баг или flaky test |
| API | уже покрыто; использовать seed helpers e2e |
| Unit | при фиксе rate/treasurer helper |
| E2E | pilot-matrix-postpay/export/refund/shipment + return-episode |
| Compose | `compose-e2e` / playwright docker как Makefile |
| Notify | продуктово: «лестницы оплаты/возврата/отгрузки в кабинете» |

## Порядок исполнения

1. `check-env-parity` + стек healthy.
2. `PLAYWRIGHT_ARGS='--grep @pilot-matrix'` или `make playwright-pilot-matrix` / `ci-pr-pilot`.
3. Отдельно return-episode suite если не в pilot tag.
4. Красное → repro → finding → план фикса (не молча skip).
5. Обновить журнал UAT строками browser (не только API).

## DoD / QG

1. `make check-env-parity`
2. Зелёный прогон заявленных pilot-matrix + return specs **или** явный список failing findings
3. `make ci-pr-pilot` при merge-ready по ladder UI
4. Журнал: секция «Лестницы (browser)» заполнена
5. Не утверждать «лестницы 100% продукта» (POSTPAY_FIXED_RATE / логисты вне scope)
