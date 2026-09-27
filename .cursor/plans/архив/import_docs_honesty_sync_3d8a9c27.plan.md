---
name: Import docs honesty sync
overview: Точечная синхронизация импортных browser-claims в pilot/domain docs с уже существующими @pilot-matrix specs (IMP7 advance + IMP8 postpay) и честный bump пилотной готовности с ~88% до ~90%. Код маршрутов не меняем.
todos:
  - id: sync-readiness
    content: "Обновить readiness-and-limits.md: claims IMP8 + ~90% + убрать устаревшие cannot-promise"
    status: completed
  - id: sync-gaps-lifecycle
    content: Синхронизировать known-gaps.md и form-lifecycle.md (даты, postpay browser, L57)
    status: completed
  - id: sync-e2e-matrix-roles
    content: Добавить postpay/advance rows в e2e-coverage-matrix.md; поправить treasurer в scenario-role-directory.md
    status: completed
  - id: archive-imp8-plan
    content: Закрыть stale todos в .cursor/plans/imp8_postpay_uat_10_3.plan.md
    status: completed
  - id: docs-format-gate
    content: Прогнать make docs-format-check из vdp/
    status: completed
  - id: notify-mgmt-done
    content: Отправить mgmt notify done после закрытия docs-волны
    status: completed
isProject: false
---

# Docs honesty: import browser claims → ~90%

## Цель

Пилотная оценка сейчас ~88% и занижена относительно кода: `@pilot-matrix` уже закрывает аванс (IMP7) и постоплату RATE_ON_PP (IMP8), а docs всё ещё отрицают postpay browser / «сквозной Playwright аванса и постоплаты». Работа — только docs + сверка со specs; новый продукт/E2E не пишем. После синхронизации — честные ~90% пилота.

## Вердикт по фактам (источник bump)

Уже в репо:

- [`vdp/fe/e2e/pilot-matrix-postpay-rate.spec.ts`](vdp/fe/e2e/pilot-matrix-postpay-rate.spec.ts) — wizard `postPayment` → provider-first → RateCommissionPanel → доп. поручение → treasurer → `report_waiting` → completed (`@pilot-matrix`, IMP8).
- [`vdp/fe/e2e/pilot-matrix-full-ladder.spec.ts`](vdp/fe/e2e/pilot-matrix-full-ladder.spec.ts) — treasurer + `execution_deadline` → completed (IMP7; advance browser уже частично признан в readiness, но «нельзя обещать сквозной Playwright аванса» устарело).

Ещё открыто и **остаётся** в gaps (не раздувать %):

- полный wizard `payment_method:advance` click ladder end-to-end;
- import treasurer / RATE_ON_PP **не** в обязательном PR smoke;
- customer robot fixture pack `awaiting_import`;
- `POSTPAY_FIXED_RATE`, prod/staging vendor, full matrix all roles × statuses.

## Слои

| Слой | Scope |
|---|---|
| UI / FE / домен / API | вне scope — код не трогаем |
| Docs | in — точечный sync claims |
| Unit / E2E | вне scope как новые тесты; только сверка существования specs |
| Compose / repro | вне scope |
| Notify | in — краткий `done` после закрытия docs-волны |

## Правки по файлам

### 1. [`vdp/docs/pilot/readiness-and-limits.md`](vdp/docs/pilot/readiness-and-limits.md)

- Дата сверки оставить/обновить 2026-09-14 (или день исполнения).
- L3: убрать «postpay full browser journey не заявлены»; зафиксировать pilot-matrix coverage advance treasurer + postpay RATE_ON_PP; wizard advance E2E по-прежнему не заявлен.
- L7–9: оценка пилота **~90%** (было ~88%); в тексте полноты явно назвать оба browser ladder.
- L15: заменить «полный browser import journeys» на более точное: слабее wizard advance E2E / PR-smoke import / prod observability — не «нет import browser».
- L31 («Что нельзя обещать»): убрать «Сквозной Playwright аванса и постоплаты»; оставить полный matrix all statuses, wizard advance E2E если нужно отдельной фразой, Nest/prod оговорки.
- L55 Gate metrics: добавить pilot-matrix browser postpay RATE_ON_PP (IMP8) рядом с advance treasurer.

Соблюдать [`vdp/docs/conventions/format.md`](vdp/docs/conventions/format.md): без таблиц, списков, bold, backticks.

### 2. [`vdp/docs/pilot/known-gaps.md`](vdp/docs/pilot/known-gaps.md)

- L3: дата и scope — после IMP0–IMP7 / P1–P7 + IMP8 browser, не «IMP0–IMP6».
- L19 Import routes: убрать «Не заявлено: полный browser journey постоплаты»; оставить незаявленными wizard advance E2E и `release-gate` как обязательный gate пакета; Verify дополнить `@pilot-matrix` postpay.
- L37 Playwright: явно упомянуть `pilot-matrix-postpay-rate` / postpay ladder; сохранить «не в обязательный PR smoke».

### 3. [`vdp/docs/domain/form-lifecycle.md`](vdp/docs/domain/form-lifecycle.md)

- L33: заменить «Полный browser E2E постоплаты не заявлен» на покрытие `@pilot-matrix` IMP8 (+ ссылка смыслом на spec без backtick-перегруза в prose, по format).
- L57: смягчить «не полным compose browser ladder» — API compose-e2e + Playwright `@pilot-matrix` для обеих импортных веток; не полный export-style compose browser ladder / не PR smoke.

### 4. [`vdp/docs/development/e2e-coverage-matrix.md`](vdp/docs/development/e2e-coverage-matrix.md)

Сейчас нет строк postpay / RATE_ON_PP. Добавить journey-параграфы (формат development допускает больше техники):

- Journey import advance treasurer deadline — UI `@pilot-matrix` full-ladder (IMP7).
- Journey import POSTPAY_RATE_ON_PP provider-first rate commission — UI `pilot-matrix-postpay-rate.spec.ts` (IMP8).
- Явно: не в PR smoke; path-filter / `make playwright-pilot-matrix`.

### 5. [`vdp/docs/pilot/scenario-role-directory.md`](vdp/docs/pilot/scenario-role-directory.md)

- L23: уточнить, что treasurer участвует в `@pilot-matrix` import advance и postpay ladders; формулировка «без отдельного браузерного прогона» для treasurer — устарела для импортных путей.

### 6. Архив плана (гигиена, не gate)

- [`.cursor/plans/imp8_postpay_uat_10_3.plan.md`](.cursor/plans/imp8_postpay_uat_10_3.plan.md): todos → completed / факт «journey exists»; убрать «Browser journey отсутствует».

## Что не делаем в этой волне

- Новый Playwright / FE / Go код ради процентов.
- Включение import specs в обязательный PR smoke (отдельное решение CI-стоимости).
- Customer robot fixture import, OCR review dialog, staging vendor.
- Заявление 100% / Nest parity / prod go-live выше текущих оговорок.

## Сверка с rules

Обязательны:

- `честность-готовности` — % только после claims = код;
- `планирование-сверка-с-rules` / `базовые-правила-инструмента` — слои + QG в DoD;
- `vdp-ci-local-gate` — для docs: `make docs-format-check`;
- `mgmt-tg-notify` — краткий product-language `done` после закрытия;
- `docs/conventions/format.md` — формат `vdp/docs/**`.

Вне scope: `fe-interaction-contracts`, AuthZ/деньги, `vdp-fe-docker-пересборка`, ML/OCR product.

## DoD / QG

1. Все must-файлы выше синхронизированы; устаревшие отрицания postpay/сквозного Playwright сняты.
2. Readiness пилота зафиксирован как ~90% с явной опорой на IMP7+IMP8 `@pilot-matrix`.
3. Реальные gaps (wizard advance E2E, PR-smoke exclusion, customer pack, FIXED_RATE) сохранены.
4. Из `vdp/`: `make docs-format-check` зелёный.
5. `make -C vdp notify-mgmt` kind=`done` — продуктовый язык: в пилотных docs зафиксированы browser-пути импортного аванса и постоплаты; готовность пилота ~90%.

Не утверждать «CI merge-ready по journey» и не гонять `make ci-pr` ради этой docs-волны (нет FE/Go diff).
