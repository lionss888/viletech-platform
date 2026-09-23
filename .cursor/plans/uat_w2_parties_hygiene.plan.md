---
name: UAT W2 гигиена org/CP pick
overview: "Убрать шум E2E из списков организации/контрагента в мастере и устранить сброс выбора org (findings F2/F3)."
todos:
  - id: w2-confirm-f3
    content: "E2E/unit: смена CP не сбрасывает выбранную org"
    status: pending
  - id: w2-default-seed
    content: "Default org = seed ООО Пример для user; сортировка seed сверху"
    status: pending
  - id: w2-wipe-hygiene
    content: "Документировать/расширить wipe: probe orgs-CP vs forms-only; политика local UAT"
    status: pending
  - id: w2-gate
    content: "check-env-parity → unit → ci-pr (wizard parties); ci-main если новый e2e вне smoke"
    status: pending
isProject: false
---

# UAT Волна 2: гигиена сторон (org / CP)

## Источник

UAT 2026-09-23 findings **F2**, **F3** (`заметки/uat-кабинеты-feedback-2026-09-23.md`).

## Acceptance

1. В мастере для seed-user первая/default организация — `ООО Пример` (или единственная «своя»), не `Inline Org *`.
2. Тестовый шум (Inline/Persist/Deadend/Pilot) не доминирует в UI клиента на локальной приёмке: либо wipe/фильтр probe-сущностей, либо отдельный namespace label + сортировка seed first.
3. Выбор контрагента **не** сбрасывает уже выбранную организацию (F3 подтверждён тестом).
4. Честно: полный wipe orgs на alpha — только если продукт/ops согласуют; иначе фильтр UI + docs для local UAT.

## Вне scope

- OCR banner (W1)
- Матрица статусов / assign provider
- Удаление всех исторических CP с alpha без политики

## Сверка с `.cursor/rules`

**Обязательны:** `планирование-сверка-с-rules`, `честность-готовности`, `ui-проблема-сразу-воспроизведи`, `ui-web-практики`, `ux-когнитивная-нагрузка` (Hick / Choice Overload в combobox), `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

**Вне scope:** Provider ПДн, платежный путь, ML.

**Gate:** `check-env-parity` → FE unit → `ci-pr`; при новом e2e вне PR-smoke → **`ci-main`**.

## Слои

| Слой | Действие |
|---|---|
| UI | Default + сортировка; меньше шума в combobox |
| FE | Organization/Counterparty pick на `forms-new-page` |
| API / seed | Опционально: probe wipe расширить или тег `probe=true` на E2E entities |
| Unit | sort/default helper; F3 state |
| E2E | parties step: seed org selected; change CP keeps org |
| Docs | development note: wipe forms ≠ wipe catalogs |
| Notify | продуктово: «в мастере клиент видит свою организацию первой» |

## DoD / QG

1. `make check-env-parity`
2. Unit + targeted wizard e2e
3. `ci-pr` или `ci-main` по path
4. F2/F3 закрыты в журнале
5. `notify-mgmt` после закрытия
