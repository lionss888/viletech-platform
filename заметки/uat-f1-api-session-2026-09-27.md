# UAT F1 — API / session / submit (2026-09-27)

Источник: ручной тест alpha + план `.cursor/plans/uat_f1_api_session.plan.md`.

## Классификация localhost

| Симптом | Localhost | Вердикт |
|---|---|---|
| Manager `GET /admin/account` 403 | 403 (ожидаемо), FE вызывал для manager | **product** — убран вызов |
| Manager `GET /process-roles` | 200 | alpha 401 — **alpha-only / session** |
| Manager `GET /counterparty/{id}` | 200 | alpha 403 — **alpha-only / drift** (связь с F3) |
| Upload 401 | path без refresh | **product** — authFetch + refresh |
| Submit 409 из `creating` | transition not allowed | **product** — разрешён submit из creating |
| Submit 409 UX | сырой English | **product** — formatActionError |

## Сделано

- `visibleForms` / store: `listAdminAccounts` только для `root`.
- `files.ts`: multipart/attach/delete через refresh-on-401; copy 401/403.
- `format-api-error.ts` + ActionPanel.
- Domain: `creating` → submit targets как у draft.
- Gate: `make check-env-parity` + `make ci-pr-pilot` green.

## Вне scope (не чинили)

- Redeploy alpha.
- F2 disabled submit без документов.
- F3 verify CP (при alpha 403 на GET CP — проверить после выката F1).
