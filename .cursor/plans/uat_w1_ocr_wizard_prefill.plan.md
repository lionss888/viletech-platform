---
name: UAT W1 OCR wizard prefill
overview: Живой prefill OCR на реальных PDF из вводных; ясный banner при limitations; не обещать авто-подстановку без данных (F1).
todos:
  - id: w1-repro-real-pdf
    content: Repro F1 на реальном инвойсе из вводные/примеры документов/Инвойсы
    status: completed
  - id: w1-banner-copy
    content: "Banner: при limitations не обещать «поля подставятся сами» на шаге 1"
    status: completed
  - id: w1-prefill-apply
    content: Prefill amount/invoice/CP currency когда extraction confidence OK + HITL review
    status: completed
  - id: w1-tests-gate
    content: Unit extraction banner + e2e extraction_confirm; check-env-parity → ci-pr-pilot если OCR path
    status: completed
isProject: false
---

# UAT Волна 1: OCR мастер — prefill и честный banner

## Источник

UAT 2026-09-23 finding **F1** (`заметки/uat-кабинеты-feedback-2026-09-23.md`).

## Acceptance

1. **Сначала живой browser repro** на `localhost:5173`: жест upload (`filechooser` / FilePickButton) с PDF из `вводные/примеры документов/Инвойсы` (не только stub robot, не только API extraction/start).
2. При успешном extraction сумма и/или номер инвойса появляются на шаге «Условия» без ручного ввода (или через «Просмотр данных» → подтвердить HITL).
3. Если extraction с ограничениями — banner **не** обещает авто-подстановку; явный next step: заполнить вручную / открыть данные.
4. OCR остаётся side-path: нет auto-submit, нет auto-pay (`машинное-обучение`).
5. Stub robot PDF может оставаться «с ограничениями» — отдельный fixture с извлекаемыми полями для e2e.

## Вне scope

- Гигиена org/CP (W2)
- no_documents invoice gate (W3)
- Смена статусной машины

## Сверка с `.cursor/rules`

**Обязательны:** `планирование-сверка-с-rules`, `честность-готовности`, `ui-проблема-сразу-воспроизведи`, `ui-web-практики`, `ux-взаимодействие-и-скорость` (Doherty / progress), `машинное-обучение` (HITL, no auto-pay), `fe-interaction-contracts`, `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

**Вне scope:** Provider ПДн, shared DB.

**Gate:** `check-env-parity` → FE unit extraction → gesture/e2e OCR surface → **`ci-pr`**; если path `@pilot-matrix` / extraction matrix → **`ci-pr-pilot`**.

## Слои

| Слой | Действие |
|---|---|
| UI | Banner copy; progress; review dialog |
| FE | `forms-new-page`, `extraction`, `OcrProgress`, `ExtractionReviewDialog` |
| Домен | не менять статусы; OCR → draft fields only |
| API | extraction readiness / result уже есть |
| Unit | banner state + mergeExtractionPrefill |
| E2E | upload gesture + prefill assert на fixture с полями |
| Compose | extraction+docling healthy (уже в ocr-path-gate) |
| Notify | «в мастере поля из инвойса подставляются после распознавания» |

## DoD / QG

1. `make check-env-parity`
2. Живой repro F1 на реальном PDF закрыт или честно «stub-only»
3. Unit + targeted e2e
4. Заявленный gate зелёный
5. F1 закрыт в журнале; `notify-mgmt` после закрытия волны
