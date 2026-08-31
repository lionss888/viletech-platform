---
name: VDP documentation program
overview: Создать структурированную документацию в vdp/docs/ и точку входа vdp/README.md с жёстким форматом (только h1–h3 и p, без оформительских символов), консолидировав разрозненные материалы для разработчиков и пилотной передачи заказчику.
todos:
  - id: doc0-scaffold
    content: "DOC0: vdp/README.md + vdp/docs/ index + docs/conventions/format.md (h1–h3, p only)"
    status: pending
  - id: doc2-dev-guide
    content: "DOC2: getting-started, testing, makefile-reference (формат h1–h3, p)"
    status: pending
  - id: doc6-pilot
    content: "DOC6: pilot/readiness-and-limits, uat-scenarios, known-gaps (формат h1–h3, p)"
    status: pending
  - id: doc1-architecture
    content: "DOC1: architecture/overview, contexts-and-data, app-vs-demo (формат h1–h3, p)"
    status: pending
  - id: doc3-domain
    content: "DOC3: roles-and-authz, form-lifecycle, documents-and-uploads (формат h1–h3, p)"
    status: pending
  - id: doc5-product-copy
    content: "DOC5: copy-glossary, role-cabinets, provider-data-boundary (формат h1–h3, p)"
    status: pending
  - id: doc4-api
    content: "DOC4: api/overview + openapi expansion (формат h1–h3, p)"
    status: pending
  - id: doc7-operations
    content: "DOC7: docker-compose, environment, staging-checklist, CI doc (формат h1–h3, p)"
    status: pending
  - id: doc-format-lint
    content: "DOC-gate: скрипт или тест проверки vdp/docs/**/*.md на запрещённую разметку"
    status: pending
isProject: false
---

# Программа документации VDP (DOC0–DOC7)

## Формат документации (MUST)

Правило распространяется на все файлы vdp/README.md и vdp/docs/**/*.md. Не распространяется на .cursor/plans и рабочие заметки.

### Разрешено

Только иерархия типографики Markdown:

- h1 — один на документ, заголовок страницы
- h2 — основные разделы
- h3 — подразделы внутри h2
- p — абзацы текста (основной носитель содержания)

### Запрещено (оформительские символы и элементы)

- Markdown-таблицы (вертикальные черты, строки-разделители заголовков)
- Маркированные и нумерованные списки (дефис, звёздочка, 1.)
- Чекбоксы и task-листы
- Bold, italic, strike
- Horizontal rule (---, ***, ___)
- Blockquote (>)
- Mermaid, ASCII-диаграммы, блок-схемы в markdown
- Emoji и декоративные символы (стрелки, буллеты Unicode, box-drawing)
- HTML-теги для оформления
- Вложенные уровни заголовков ниже h3 (h4–h6)
- Backtick-fences и inline backticks как оформление (см. исключение ниже)

### Как передавать структурированные данные без таблиц и списков

Табличные и перечисляемые данные оформляются сериями абзацев p с явной микроструктурой в тексте:

Пример (допустимо):

Поле DATABASE_URL_CORE. Значение postgres://vdp_core:vdp_core@localhost:5432/vdp_core. Назначение подключение core к Postgres в dev.

Пример (недопустимо):

Таблица env vars или список из трёх пунктов с дефисом.

### Исключение для команд (узкое)

Только в vdp/docs/development/*.md допускаются fenced code blocks для многострочных shell-команд, которые нужно копировать в терминал. Во всех остальных разделах команды, пути и идентификаторы пишутся внутри абзацев p обычным текстом.

### Ссылки

Гиперссылки на другие документы и исходники допустимы внутри абзацев p стандартным markdown-синтаксисом ссылки. Без декоративного оформления вокруг.

### DOC0 обязан зафиксировать

Файл vdp/docs/conventions/format.md — канон правила с примерами допустимого и недопустимого фрагмента.

---

## Текущее состояние

FE dev и parity checklist живут в vdp/fe/README.md — только frontend, нет корневого README.

RD0 gate и seed IDs в vdp/rd0-baseline.md — рабочие заметки, не product docs.

Статус готовности в заметки/vdp-промежуточный-статус-2026-08-30.md — вне vdp.

Глоссарий UI в .cursor/rules/методология/glossariy-po-rolyam.txt — в rules, не в product docs.

OpenAPI частичный в vdp/shared/openapi/forms.yaml — около 7 path-групп.

Copy consistency gate в vdp/fe/src/lib/ved/copy/copy-consistency.ts — исполняемый gate, не human-readable doc.

Нет vdp/README.md, каталога vdp/docs/, архитектурного описания, доменного справочника, пакета ограничений MVP для заказчика.

Существующие markdown (fe/README, rd0-baseline, заметки) при переносе контента в vdp/docs/ подлежат переформатированию под правило h1–h3, p.

---

## Rules gate (обязательные для программы)

честность-готовности — везде явно: 331/331 маршрут не равно prod parity; stub-инвентарь без завышения.

границы-и-контексты — архитектура core / hub / fe; отдельные БД; Provider без ПДн.

screaming-architecture — доменные разделы: form-payment, compliance, provider-execution, bank.

use-cases — матрица ролей и journey в domain docs.

ui-web-практики и поддержка-и-обратная-связь — role cabinets, top tasks, self-service help.

тесты-архитектуры — раздел testing: пирамида, integration-gate, Playwright.

развертывание-и-доставка — DOC7: env, compose, CI sketch.

Вне scope: полная миграция Nest; BDUI schema engine; переписывание .cursor/plans.

---

## Целевая структура vdp/docs/

vdp/README.md — точка входа, quick start, карта docs.

vdp/docs/README.md — индекс и аудитории dev, pilot, support.

vdp/docs/conventions/format.md — правило h1–h3, p (канон).

vdp/docs/architecture/overview.md — core, hub, fe, порты, compose.

vdp/docs/architecture/contexts-and-data.md — владельцы данных, outbox, hub.

vdp/docs/architecture/app-vs-demo.md — JWT app vs demo mocks.

vdp/docs/development/getting-started.md — make compose-up, seed logins.

vdp/docs/development/testing.md — npm test, go test, integration-gate, playwright.

vdp/docs/development/makefile-reference.md — цели Makefile абзацами p.

vdp/docs/domain/roles-and-authz.md — роли и ACL.

vdp/docs/domain/form-lifecycle.md — статусная машина User to completed.

vdp/docs/domain/documents-and-uploads.md — contract, order, payment, report, shipment.

vdp/docs/product/role-cabinets.md — top tasks per role.

vdp/docs/product/copy-glossary.md — продуктовый глоссарий из glossariy-po-rolyam.

vdp/docs/product/provider-data-boundary.md — что Provider видит и не видит.

vdp/docs/api/overview.md — REST, auth, action bridge.

vdp/docs/api/openapi.md — forms.yaml и endpoint matrix.

vdp/docs/operations/docker-compose.md — сервисы, профили.

vdp/docs/operations/environment.md — env vars абзацами p.

vdp/docs/operations/staging-checklist.md — staging env.

vdp/docs/pilot/readiness-and-limits.md — честная готовность.

vdp/docs/pilot/uat-scenarios.md — UAT по ролям.

vdp/docs/pilot/known-gaps.md — gap-analysis и residual R11.

Принцип: один источник истины на тему. fe/README.md сокращается до FE-specific и ссылается на vdp/docs/. Parity-таблица не дублируется — переносится в development/testing.md в формате абзацев p.

---

## Волны работ

### DOC0 — Scaffold, conventions, точка входа (0.5 дня)

In: vdp/README.md, vdp/docs/README.md, vdp/docs/conventions/format.md, карта документов.

Fix zones: новые markdown в vdp/docs/; шапка-ссылка в vdp/fe/README.md.

DoD:

Новый разработчик находит quick start от корня vdp/ за две минуты.

format.md содержит MUST-правило, примеры good/bad, исключение для development code blocks.

rd0-baseline.md помечен как internal gate notes со ссылкой product docs to docs/.

Индекс разделяет аудитории Dev, Pilot, Support абзацами p без списков.

---

### DOC1 — Архитектура и границы (1 день)

In: overview, contexts-and-data, app-vs-demo. Без mermaid — поток FE to core to outbox to hub описан абзацами p и h2/h3.

Источники: vdp/docker-compose.yml, vdp/core/internal/outbox/, vdp/hub/, fe_core_integration plan.

DoD:

Три контекста и запрет shared DB описаны в формате h1–h3, p.

Provider DTO boundary со ссылкой на product/provider-data-boundary.md.

Root UI как отдельный контур без bank copy bleed.

---

### DOC2 — Developer guide (0.5–1 день)

In: getting-started, testing, makefile-reference.

Источники: vdp/Makefile, vdp/fe/README.md, vdp/scripts/.

DoD:

Команды compose-up, integration-gate, playwright-e2e, npm test, go test — fenced blocks только здесь.

Seed-аккаунты и UUID — серия абзацев p (не таблица).

Troubleshooting health timeout и bank org 403 — абзацами p.

---

### DOC3 — Domain reference (1 день)

In: roles-and-authz, form-lifecycle, documents-and-uploads.

Источники: vdp/fe/src/lib/ved/statuses.ts, vdp/core/internal/authz/, compose-e2e journey.

DoD:

Роли и допустимые действия — h2 на роль, h3 на группу действий, p на описание.

Основной путь и ветка refund — последовательность статусов абзацами p (не diagram).

Источник истины статуса core, UI проекция — явно в p.

---

### DOC4 — API reference (1–2 дня, итерации)

In: api/overview, api/openapi.

Источники: TestR12MatrixInScopeComplete, bank routes R10, shared/openapi/forms.yaml.

DoD:

Auth JWT, forms, role paths, bank forms — h2/h3, p.

Оговорка incremental OpenAPI vs матрица 331/331 в коде.

Примеры curl в development/getting-started.md или api/overview.md как fenced blocks если многострочные.

---

### DOC5 — Product copy и кабинеты (0.5 дня)

Зависимость: RW9 закрыт.

In: copy-glossary, role-cabinets, provider-data-boundary.

Источники: glossariy-po-rolyam.txt, copy-consistency.ts, ui-web top tasks.

DoD:

Заявка vs сделка per-role — h3 на роль, p на термин.

Provider PII запрет в UI copy.

Bank terminology без root wording.

Глоссарий статусов: h3 на status id, p на labels per role (не pipe-таблица как в rules-файле).

---

### DOC6 — Pilot handoff (0.5–1 день)

In: readiness-and-limits, uat-scenarios, known-gaps.

Источники: заметки/vdp-промежуточный-статус, заметки/gap-analysis-backend.md.

DoD:

Stub-инвентарь hub, xlsx, dev secrets — абзац на stub.

UAT сценарии — h2 на сценарий, p на шаги (не numbered list).

Нет формулировок 100% готовности и полный паритет Nest.

---

### DOC7 — Operations и CI (1 день, можно после пилота)

In: docker-compose, environment, staging-checklist, CI doc.

Источники: vdp/core/pkg/config/config.go, compose profiles.

DoD:

Env vars — абзац на переменную (Поле. Default. Prod recommendation.).

Staging checklist — h3 на блок интеграции, p на требования.

CI: make integration-gate и playwright-e2e описаны абзацами p.

---

### DOC-format-lint — Проверка формата (0.25 дня, в DOC0 или финальный gate)

In: скрипт scripts/docs-format-check.sh или vitest/go test на vdp/docs/**/*.md.

Проверки: нет строк начинающихся с - или * или 1.; нет |...|; нет --- как hr; нет ``` кроме development/; ровно один h1; нет h4+.

DoD:

make docs-format-check или npm run docs:lint в integration-gate docs (отдельно от code gate на первом этапе).

---

## Порядок и зависимости

DOC0 первым — conventions/format.md блокирует стиль всех волн.

DOC2 и DOC6 параллельно после DOC0.

DOC1 после DOC0.

DOC3 после DOC1.

DOC5 после DOC3 и RW9.

DOC4 после DOC2.

DOC7 после DOC2.

DOC-format-lint после DOC0, повторно после DOC6.

Рекомендуемый порядок: DOC0 → DOC2 + DOC6 → DOC1 → DOC3 → DOC5 → DOC4 → DOC7 → DOC-format-lint final.

---

## Gate программы (DoD всей DOC)

vdp/README.md и vdp/docs/README.md существуют и соответствуют format.md.

Все vdp/docs/**/*.md проходят docs-format-check.

Dev поднимает стек и прогоняет gates по docs alone.

Pilot package docs/pilot/ без ссылок на .cursor/.

Утверждения о готовности согласованы с честность-готовности.

fe/README.md не дублирует parity — FE delta и links.

Review: make integration-gate green на дату документа.

---

## Артефакты plan-файлов (после OK)

DOC0 .cursor/plans/doc0_vdp_docs_scaffold.plan.md — 0.5 д

DOC1 .cursor/plans/doc1_vdp_architecture.plan.md — 1 д

DOC2 .cursor/plans/doc2_vdp_dev_guide.plan.md — 0.5–1 д

DOC3 .cursor/plans/doc3_vdp_domain_reference.plan.md — 1 д

DOC4 .cursor/plans/doc4_vdp_api_reference.plan.md — 1–2 д

DOC5 .cursor/plans/doc5_vdp_product_copy.plan.md — 0.5 д

DOC6 .cursor/plans/doc6_vdp_pilot_handoff.plan.md — 0.5–1 д

DOC7 .cursor/plans/doc7_vdp_operations.plan.md — 1 д

Master-index опционально: .cursor/plans/vdp_documentation_master.plan.md.

Общая оценка: 5–7 рабочих дней последовательно; около 4 дней при параллели DOC2+DOC6 и отложенном DOC7. DOC-format-lint +0.25 д.
