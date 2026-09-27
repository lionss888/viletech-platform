---
name: UAT cabinet hygiene
overview: "Один план вместо W2+W4+W5: гигиена org/CP, инвойс/контракт, copy доработки, sticky create, root cancel. Первый шаг — архив всех прочих планов в .cursor/plans/архив/ и пересборка handoff queue."
todos:
  - id: archive-plans
    content: Создать .cursor/plans/архив/; переместить все прочие *.plan.md; обновить queue.json + sync-handoff-queue + handoff README
    status: completed
  - id: repro-baseline
    content: Localhost repro F2/F6/F7/F9/F11 (и spot F3) до кода; зафиксировать скрин/DOM
    status: completed
  - id: fix-f2-org-sort
    content: Seed-first sort/default org в мастере + unit
    status: completed
  - id: fix-f3-test
    content: "Unit/E2E: смена CP сохраняет org"
    status: completed
  - id: fix-f6-invoice-contract
    content: Убрать invoice в contract_number в create/patch; labels на detail; unit/E2E
    status: completed
  - id: fix-f7-sticky-create
    content: Скрыть/ослабить create CTA/FAB на form detail
    status: completed
  - id: fix-f9-corrections-copy
    content: "Docs-reject: не misleading CP copy; dashboard/detail выровнять"
    status: completed
  - id: fix-f11-root-cancel
    content: Сверить FE/docs с cancel_by_manager path; E2E root cancel draft
    status: completed
  - id: qg-ci-main
    content: check-env-parity → unit → ci-main; закрыть DoD/журнал; notify-mgmt; sync-handoff-queue
    status: completed
isProject: false
---

# UAT cabinet hygiene (свод W2+W4+W5)

Заменяет: uat_w2_parties_hygiene, uat_w4_card_field_labels, uat_w5_root_cancel. Findings F2/F3/F6/F7/F9/F11 из заметок/uat-кабинеты-feedback-2026-09-23.md.

## 0. Архив планов (первый шаг исполнения)

- Создать `.cursor/plans/архив/`.
- Переместить все текущие `.cursor/plans/*.plan.md` кроме этого сводного файла в `архив/`.
- Обновить `.cursor/handoff/очередь-компромисс-2026-09-26/queue.json`: daily = только этот план.
- `make -C vdp sync-handoff-queue` и поправить handoff README (next = этот план).

## Вердикт по коду

- F2 открыт: default organizations[0], нет seed-first в forms-new-page.tsx.
- F3 скорее ок на select-path — нужен регрессионный тест.
- F6 открыт: platform-store.ts пишет contract_number из draft.invoiceNumber; мастер склеивает contractNumber || invoiceNumber.
- F7 открыт: create CTA/FAB в VedAppShell.tsx без скрытия на /forms/:id.
- F9 частично: detail уже мягче; нет логики docs-reject; dashboard ещё «контрагент не указан».
- F11: не новый domain action; канон cancel_by_manager / PUT manager form-payment cancel от root; FE уже мапит root_cancel_form. Сверить UI/docs/e2e, не POST actions/root_cancel.

## Цель

Мастер: своя org первая; смена CP не сбрасывает org. Карточка: инвойс и договор на местах. Доработка по docs без ложного «нужен контрагент». Detail без competing sticky create. Root отменяет draft рабочим путём.

## Scope

- Sort/default org (seed ООО Пример / non-probe сверху).
- Unit+E2E keep org при смене CP.
- Create/patch: invoice отдельно от contract_number; labels на detail.
- Hide/weaken create FAB/sidebar CTA на form detail.
- Corrections copy при docs-reject; выровнять dashboard.
- Root cancel через рабочий path + docs/uat-scenarios.

## Вне scope

Wipe probe на alpha; новая domain action root_cancel; OCR W1; no_docs W3; UAT W7; Stage B API contract; admin redesign.

## Слои

- UI: мастер parties; form-detail; shell create visibility.
- FE: forms-new-page.tsx, platform-store.ts, mappers.ts, VedAppShell.tsx, form-detail-page.tsx, dashboard-page.tsx, action-bridge.ts.
- Домен: без смены SM; AuthZ root для cancel_by_manager уже есть.
- API: без новых endpoint.
- Unit: org sort; invoice/contract map; F3; corrections helper; root bridge.
- E2E: parties seed-first + keep org; invoice labels; detail без primary create; root cancel draft.
- Compose/repro: localhost seed до готово (ui-проблема-сразу-воспроизведи).
- Docs/handoff/notify: uat-scenarios root path; queue sync; notify-mgmt done.

## Rules

Обязательны: планирование-сверка-с-rules, plan-закрытие-и-dod, честность-готовности, ui-проблема-сразу-воспроизведи, ui-web-практики, ux-когнитивная-нагрузка, playwright-e2e, тесты-архитектуры, use-cases, безопасность-ролей-и-данных, vdp-ci-local-gate, mgmt-tg-notify, правила-построения.

Вне scope: ML, serverless, Nest modules, Provider ПДн.

## DoD / QG

1. Архив прочих планов + queue.json + sync-handoff-queue.
2. Живой repro F2/F6/F7/F9/F11 до фикса; F3 — тест.
3. make check-env-parity.
4. FE unit по затронутым helperам.
5. E2E вне узкого PR-smoke → make ci-main (merge-ready). При path-filter pilot-matrix — ещё ci-pr-pilot.
6. F2/F3/F6/F7/F9/F11 закрыты в журнале UAT.
7. Todos+DoD в этом плане; sync-handoff-queue; notify-mgmt.

## Accept

- Seed-user: первая org ООО Пример (или единственная своя), не Inline Org.
- Смена CP не сбрасывает org (тест).
- Инвойс на карточке = инвойс; договор = contract_number.
- На /forms/:id create не primary competing.
- Docs-reject: next step про документы, не ложный CP gap при заполненном CP.
- root@ отменяет draft рабочим путём; чужая роль — явный запрет.
- ci-main зелёный.
