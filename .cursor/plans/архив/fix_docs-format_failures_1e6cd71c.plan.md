---
name: Fix docs-format failures
overview: Привести два упавших development-how-to к канону docs/conventions/format.md, чтобы docs-format-check и начало ci-pr снова проходили.
todos:
  - id: rewrite-local-qg-doc
    content: Переписать local-qg-deploy-secrets.md под format.md
    status: completed
  - id: rewrite-github-secrets-doc
    content: Переписать setup-github-deploy-secrets.md под format.md
    status: completed
  - id: align-rule-wording
    content: Поправить формулировку про tables в vdp-ci-local-gate.mdc
    status: completed
  - id: verify-docs-format
    content: make docs-format-check зелёный
    status: completed
isProject: false
---

# План 2: фикс красного docs-format-check

## Сверка с rules

Обязательны: `vdp-ci-local-gate`, `планирование-сверка-с-rules`, `честность-готовности`, канон [`vdp/docs/conventions/format.md`](vdp/docs/conventions/format.md).

Вне scope: параллелизация gate (план 1), смена сценариев Playwright/unit, `compose-fe-refresh`, правки `.mdc` кроме случая если rule врёт про «таблицы в development» — тогда одна правка формулировки в `vdp-ci-local-gate.mdc`, без ослабления checker.

Gate/DoD: `cd vdp && make docs-format-check` зелёный; при необходимости короткий `ci-pr-fast` после зелёных docs.

## Что упало

Local QG RUN `make ci-pr` остановился на `docs-format-check` (46 FAIL) в:

- [`vdp/docs/development/local-qg-deploy-secrets.md`](vdp/docs/development/local-qg-deploy-secrets.md)
- [`vdp/docs/development/setup-github-deploy-secrets.md`](vdp/docs/development/setup-github-deploy-secrets.md)

Нарушения относительно checker [`vdp/scripts/docs-format-check.sh`](vdp/scripts/docs-format-check.sh) и `format.md`: bold, списки (`-` / `1.`), таблицы `|`, заголовки `####+`. В `docs/development/` разрешены только fenced code blocks для команд; таблицы и списки запрещены везде.

Образец допустимого стиля: [`vdp/docs/development/getting-started.md`](vdp/docs/development/getting-started.md) — h1–h3, абзацы с микроструктурой «Поле. Значение. Назначение.», команды в ``` fences.

## Работы

1. Переписать оба файла без запрещённой разметки: смысл how-to сохранить (локальные env, GitHub/GitLab secrets, BotFather/getUpdates, environments alpha…test, ссылки на скрипты).
2. Таблицы environments → серия абзацев.
3. Нумерованные шаги → абзацы «Шаг N.» или отдельные `###` без списков.
4. Убрать `**bold**`; backticks вне fence — только если checker их ещё запрещает (проверить хвост `docs-format-check.sh`); внутри fence — ок.
5. Исправить вводящую строку в [`vdp-ci-local-gate.mdc`](.cursor/rules/vdp-ci-local-gate.mdc): «How-to с командами/таблицами — в docs/development/» → «How-to с командами (fenced) — в docs/development/; таблицы/списки/bold запрещены и там» — чтобы rule не противоречил checker.
6. Прогнать `make docs-format-check` с `required_permissions: ["all"]`.

## DoD

- Оба файла проходят format-check.
- Содержание остаётся usable how-to (секреты можно настроить по тексту).
- Не утверждать полный CI green без отдельного `ci-pr` / `ci-pr-fast`.
