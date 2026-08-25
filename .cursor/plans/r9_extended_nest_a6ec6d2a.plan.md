---
name: R9 Extended Nest
overview: Liquidity, VirtualAccount, TreasurerTask, Socket/SSE, Mail, Agent, HsCode — Nest as-is в vdp.
todos:
  - id: r9-liq-va
    content: Liquidity + VirtualAccount
    status: pending
  - id: r9-treasurer
    content: TreasurerTask + leftover treasurer APIs
    status: pending
  - id: r9-sse-mail
    content: SSE events + Mail notify wiring
    status: pending
  - id: r9-agent-hs
    content: Agent + HsCode + tests
    status: pending
isProject: false
---

# R9: Extended Nest contour

## Цель

Перенос оставшихся Nest-модулей as-is из gap «перенести»: liquidity, virtual-account, treasurer-task, socket, mail, agent, hs-code.

## Правила

Отдельные пакеты; без shared DB с hub; тесты на каждый модуль; VA без дубля module.

## Работы

1. Liquidity import/export offers + связь со статусами form/provider.
2. VirtualAccount balances (один модуль).
3. TreasurerTask + treasurer form endpoints leftover.
4. SSE/socket events по form id (уже задел SSE — довести события status_changed).
5. Mail via hub mail adapter на ключевых переходах.
6. Agent + HsCode CRUD/привязка invoice (Nest controllers).

## DoD

Nest controllers этих модулей = done в matrix. `go test` per package. Нет REPORTER.

## Вне scope

Bank (R10); frontend.
