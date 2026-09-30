---
name: D2 deadline currency rate
overview: "Срез D2: срок исполнения на карточке, валюты из справочника, виджет курса с «Редактировать» (#9, #11, #12). Gate ci-pr."
todos:
  - id: d2-deadline
    content: Map execution_deadline + показать срок на карточке
    status: pending
  - id: d2-rate-ui
    content: Справочник валют + виджет курса с Редактировать
    status: pending
  - id: d2-gate
    content: Unit + ci-pr + Acceptance + notify + закрыть план
    status: pending
isProject: false
---

# D2 — Срок, валюты, виджет курса

Эталон: [ориентир-скорости-запросов-заказчика-2026-09-21.md](заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md). Самодостаточный срез (без оркестратора).

## Запрос заказчика

После установки срока дата видна на карточке; валюты курса и комиссии выбираются из справочника; блок «Курс и вознаграждение» по умолчанию — виджет (курс + %) с кнопкой «Редактировать».

## Acceptance

Manager → «Установить срок исполнения» → на карточке видна дата срока. В панели курса: select валют (не свободный text); форма полей скрыта до «Редактировать»; после save снова виджет.

## Вне scope

D1/D3–D6; смена доменной логики rate/commission; notify по deadline.

## Сверка с rules

`планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `vdp-ci-local-gate`, `честность-готовности`, `ui-web-практики`, `mgmt-tg-notify`. Вне: статусная машина, AuthZ provider ПДн, platform-mounts.

## Слои

- UI: chip/строка срока; collapsed rate widget
- FE: map `execution_deadline` в [`mappers.ts`](vdp/fe/src/lib/api/mappers.ts) + показ на карточке; [`AdvanceRateCommissionPanel.tsx`](vdp/fe/src/components/ved/AdvanceRateCommissionPanel.tsx) — select из `currencies`, default view = summary + Edit
- Домен/API: без изменений (поле уже в core JSON)
- Unit: mappers + rate panel
- E2E: не расширять

## Корнеры

Пустой справочник валют; формат/TZ дедлайна; закрытие edit без save; повторная установка срока.

## DoD / QG

`check-env-parity` → FE unit → `make ci-pr` → Acceptance localhost → строка в lead-time журнале → `notify-mgmt done` → закрыть этот план (todos/DoD/status).
