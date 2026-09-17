---
name: CS-R3 release handover
overview: "Полная приёмка перед передачей: make release-gate; при продуктовом done — notify-mgmt без жаргона BPM."
todos:
  - id: r3-precheck
    content: "Убедиться CS-R1 отчёт закрыт и CS-R2 ci-pr-pilot зелёный"
    status: pending
  - id: r3-release-gate
    content: "cd vdp && make check-env-parity && make release-gate"
    status: pending
  - id: r3-notify
    content: "При закрытии волны: notify-mgmt kind=done (сборка маршрута из рычагов)"
    status: pending
isProject: false
---

# CS-R3 — сдача (release-gate)

Родитель: [конструктор_реализация_889c3d6f.plan.md](конструктор_реализация_889c3d6f.plan.md).  
Зависит от: [CS-R1](cs_r1_ops_forms_cta.plan.md), [CS-R2](cs_r2_e2e_route_hint.plan.md).

## Цель

Полная локальная приёмка перед передачей программы «конструктор сценариев» (этап 1: рычаги + подсказка). Не объявлять «готово» без зелёного `release-gate`.

## Слои

| Слой | IN / OUT |
|---|---|
| Compose / browser / postgres integration | IN через release-gate |
| Docs / notify | IN — mgmt notify при done |
| Новый продуктовый код | OUT |

## Шаги

1. Precheck: отчёт среды (R1) принят; E2E hint (R2) + `ci-pr-pilot` зелёный.
2. `cd vdp && make check-env-parity`.
3. `cd vdp && make release-gate` (долго; sandbox off / `all`).
4. При продуктовом закрытии: `make -C vdp notify-mgmt` kind=`done` — язык для менеджмента: сборка маршрута из готовых ролей / лестниц / веток; **не** «полный конструктор» / BPM / пути планов / localhost.

## DoD

- `release-gate` exit 0.
- Notify прошёл санитайзер (`mgmt-tg-notify`); без DoD-жаргона.
- Честно: этап 2 (кастом) не «закрыт» этим gate — см. CS-R4.

## Вне scope

Новые фичи кабинетов; исполнение CS-R4 кастома в VDP; коммит без просьбы.

## Сверка rules

`vdp-ci-local-gate`, `честность-готовности`, `mgmt-tg-notify`, `развертывание-и-доставка`.
