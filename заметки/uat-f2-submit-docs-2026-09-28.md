# UAT F2 — submit without docs disabled (2026-09-28)

Источник: план `.cursor/plans/uat_f2_submit_docs.plan.md` (файл плана по инструкции агента не правился).

## Baseline (localhost demo)

Черновик без документов: «Документы 0», кнопка «Отправить на проверку» была активна (`disabled: false`) — silent path к 409 с бэка.

## Сделано

- `submit-docs-gate.ts`: gate для `submit` / `submit_corr` / `accept_form` при `documents.length === 0`.
- `ActionPanel`: disabled + `title` + баннер `submit-docs-required-lock` («Нужен хотя бы один документ»).
- Unit: `submit-docs-gate.test.ts`.
- E2E: `form-ux-deadends.spec.ts` — UAT F2 `@pilot-matrix` (0 docs → disabled; после attach → enabled).

## Приёмка

- Localhost: после фикса CTA disabled, opacity 0.4, lock-текст виден.
- E2E seeds: `uploadAndAttachInvoice` перед submit в ladder/reject и смежных UI-тестах; `createSubmittedForm` тоже прикладывает PDF.
- `make check-env-parity` + `make ci-pr-pilot` — **green** (2026-09-28).
- Handoff queue: F2 done → next F3. Plan `.md` не правился (инструкция агента).

## Вне scope

- Доменный invoice gate ECO.
- Смена статусной машины.
