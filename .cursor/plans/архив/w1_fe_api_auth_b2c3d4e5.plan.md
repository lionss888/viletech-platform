---
name: W1 FE API Auth
overview: "Auth adapter к core: apiFetch, AuthProvider, /login, Vite proxy. Gate: seed JWT + GET account. Закрыто 2026-08; дальше RD0–RD11."
todos:
  - id: w1-client
    content: lib/api/client.ts + auth.ts (login/logout/refresh/account, X-Request-ID)
    status: completed
  - id: w1-session
    content: AuthProvider + useAuth + guard app-роутов
    status: completed
  - id: w1-login
    content: App /login seed *@vdp.local; ошибки политики явные
    status: completed
  - id: w1-proxy
    content: Vite proxy /api → localhost:8080
    status: completed
  - id: w1-gate
    content: "Gate: login 201 + Bearer GET /api/v1/account"
    status: completed
isProject: false
---

# W1: API client + auth

## Цель

App-режим: Interface Adapter аутентификации к core; роль только с сервера.

## Якоря

- Core auth/account routes; [`seed.go`](vdp/core/internal/repository/seed/seed.go); [`vite.config.ts`](vdp/fe/vite.config.ts)

## Правила

- [`чистая-архитектура`](.cursor/rules/чистая-архитектура.mdc) — HTTP/JWT на краю; сессия не «домен заявки»
- [`solid`](.cursor/rules/solid.mdc) — узкий порт auth API, не смешивать с forms store
- [`безопасность-ролей-и-данных`](.cursor/rules/безопасность-ролей-и-данных.mdc) — роль из JWT/account; запрет client role-switch в app
- [`интеграция-и-события`](.cursor/rules/интеграция-и-события.mdc) — REST к core; не hub
- [`устойчивость-и-наблюдаемость`](.cursor/rules/устойчивость-и-наблюдаемость.mdc) — `X-Request-ID` на каждый apiFetch
- [`use-cases`](.cursor/rules/use-cases.mdc) — ошибки политики (401) явные в UI, не «тихий» fail
- [`ui-web-практики`](.cursor/rules/ui-web-практики.mdc) / Postel — валидация полей login; seed-подсказка how-to
- [`typescript-clean-code`](.cursor/rules/typescript-clean-code.mdc)
- DoD-дисциплина: login UI без round-trip ≠ auth done

## Работы

1. `lib/api/client.ts` — relative `/api`, Bearer, refresh once on 401, typed errors, `X-Request-ID`.
2. `lib/api/auth.ts` — login / logout / refresh / getAccount.
3. `lib/auth/session.tsx` — `vdp-auth-v1` в sessionStorage; guard → `/login`.
4. `/login` → core; seed `*@vdp.local`; без `bdui.local`.
5. Vite proxy `/api` → `http://localhost:8080`.

## DoD

- core up: `user@vdp.local`/`user` → 201, token, `GET /account` 200.
- Неверный пароль → ошибка UI, сессия не пишется.
- `/demo` не читает `vdp-auth-v1`.
- CORS в Go не добавляем.

## Вне scope

Forms list/actions, registration UI.

## Gate

«W1 done — JWT+account; forms read = W2».
