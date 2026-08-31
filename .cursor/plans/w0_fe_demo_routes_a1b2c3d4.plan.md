---
name: W0 FE Demo Routes
overview: "Вынести mock под /demo/*; явная развилка demo/app по ui-web top tasks. Без API. Gate: demo офлайн как раньше. Закрыто 2026-08; дальше RD0–RD11."
todos:
  - id: w0-move-routes
    content: Перенести operational routes в src/routes/demo/*
    status: completed
  - id: w0-demo-shell
    content: Demo AppShell — /demo/*, role-switch только demo; бейдж «Демо»
    status: completed
  - id: w0-index-cta
    content: index — CTA Войти + Демо; честный копирайт режимов
    status: completed
  - id: w0-gate
    content: "Gate: /demo login→forms на моках; app placeholders без claim интеграции"
    status: completed
isProject: false
---

# W0: Demo routes split

## Цель

Разделить URL-деревья: mock demo vs app-адаптер к core. Demo — локальный показ UI vdp/fe, **не** fe-experiment / BDUI.

## Якоря

- [`vdp/fe/src/routes/`](vdp/fe/src/routes/), [`store.tsx`](vdp/fe/src/lib/ved/store.tsx), [`AppShell.tsx`](vdp/fe/src/components/ved/AppShell.tsx)

## Правила

- [`чистая-архитектура`](.cursor/rules/чистая-архитектура.mdc) / [`детали-как-плагины`](.cursor/rules/детали-как-плагины.mdc) — demo store ≠ канон домена; не выдавать за прод
- [`границы-и-контексты`](.cursor/rules/границы-и-контексты.mdc) — разные session keys demo/app
- [`ui-web-практики`](.cursor/rules/ui-web-практики.mdc) — на index два режима = два исхода; один primary путь «Войти»
- [`поддержка-и-обратная-связь`](.cursor/rules/поддержка-и-обратная-связь.mdc) — копирайт: «демо на моках» / «нужен core»
- [`ux-когнитивная-нагрузка`](.cursor/rules/ux-когнитивная-нагрузка.mdc) — Hick: не больше двух явных входов
- [`правила-построения`](.cursor/rules/правила-построения.mdc) — docs не плодить; DoD до `completed`
- DoD-дисциплина: W0 ≠ «интеграция готова»

## Работы

1. Перенести operational-роуты в `src/routes/demo/`.
2. `DemoAppShell`: nav `/demo/...`; role-switch + reset только здесь; визуальный бейдж «Демо / моки».
3. [`index.tsx`](vdp/fe/src/routes/index.tsx): primary «Войти» → `/login`; secondary «Демо без бэкенда» → `/demo`.
4. Корневые app-роуты — placeholder/redirect на `/login`, без API.
5. `VedStoreProvider` в root только для demo-контура.

## DoD

- Без core: `/demo` login→forms→action на моках как до split.
- Role-switch отсутствует на корневых app-маршрутах.
- На UI явно видно, что demo — моки.
- Нет claim «подключено к core».

## Вне scope

API, JWT, proxy, изменения core.

## Gate

«W0 done — demo split; app API = W1+».
