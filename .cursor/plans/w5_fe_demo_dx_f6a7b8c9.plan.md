---
name: W5 FE Demo DX
overview: "Перекрёстные ссылки demo↔app; изоляция сессий; честный self-service copy. Gate: навигация режимов очевидна."
todos:
  - id: w5-cross-links
    content: Ссылки demo↔app на index и login
    status: pending
  - id: w5-testing
    content: /demo/testing пути и сценарии после split
    status: pending
  - id: w5-isolation
    content: ved-demo-state-v1 vs vdp-auth-v1 без утечек
    status: pending
  - id: w5-gate
    content: "Gate: чеклист навигации demo↔app"
    status: pending
isProject: false
---

# W5: Demo DX

## Цель

Self-service выбор режима без путаницы «это прод»; сессии изолированы.

## Якоря

- `/demo/testing`; keys `ved-demo-state-v1` / `vdp-auth-v1`

## Правила

- [`поддержка-и-обратная-связь`](.cursor/rules/поддержка-и-обратная-связь.mdc) — how-to в контексте login; не маскировать моки под прод
- [`ui-web-практики`](.cursor/rules/ui-web-практики.mdc) — согласованный паттерн ссылок режима
- [`границы-и-контексты`](.cursor/rules/границы-и-контексты.mdc) / [`детали-как-плагины`](.cursor/rules/детали-как-плагины.mdc) — два плагина UI-контура, одна политика в core только у app
- [`ux-формы-навигация-онбординг`](.cursor/rules/ux-формы-навигация-онбординг.mdc) — подсказки в контексте
- [`правила-построения`](.cursor/rules/правила-построения.mdc) — **не** новый README; UI-копирайт достаточен
- DoD-дисциплина: копирайт «демо на моках» / «нужен core» обязателен

## Работы

1. App login → «Демо без бэкенда».
2. Demo login → «Войти через API (нужен core)».
3. Index CTA уточнены.
4. Прогон `/demo/testing` после path fix.
5. Logout app ≠ wipe demo storage и наоборот.

## DoD

- С login виден переход в другой режим.
- `/demo/testing` актуален.
- Нет общего session blob.

## Вне scope

Compose fe service, BDUI, auto-seed UI.

## Gate

«W5 done — DX; verification = W6».
