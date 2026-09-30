---
name: D1 OCR alerts label
overview: "Срез D1: один OCR-алерт на шаге «Проверка» и подпись кнопки «Детали распознавания» (#1, #4). Gate ci-pr."
todos:
  - id: d1-impl
    content: Убрать дубль degraded-алерта; label «Детали распознавания»
    status: completed
  - id: d1-unit
    content: Unit extractionTriggerLabel + review banner single
    status: completed
  - id: d1-gate
    content: check-env-parity → ci-pr + Acceptance + notify + закрыть план
    status: completed
isProject: false
---

# D1 — OCR: один алерт + текст кнопки

Эталон: [ориентир-скорости-запросов-заказчика-2026-09-21.md](заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md). Оркестратор не использовать — этот файл самодостаточен.

## Запрос заказчика

На шаге «Проверка» пользователь видит один алерт про ограничения OCR; кнопка открытия деталей подписана «Детали распознавания».

## Acceptance

User → мастер `/forms/new` шаг 5 при degraded OCR → ровно один жёлтый блок с текстом про ограничения; кнопка trigger не содержит «Распознавание…», показывает «Детали распознавания».

## Вне scope

Ускорение OCR/Docling; preview на шагах 2–4 (#2); upload/delete в модалке (#5); D2–D6.

## Сверка с rules

Обязательные: `планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `vdp-ci-local-gate`, `честность-готовности`, `ui-web-практики`, `ux-когнитивная-нагрузка`, `mgmt-tg-notify`. Вне scope: статусная машина, AuthZ, platform-mounts.

## Слои

- UI: один алерт на review; label кнопки
- FE: [`forms-new-page.tsx`](vdp/fe/src/components/ved/pages/forms-new-page.tsx) — не дублировать `OcrProgress` и `wizard-review-ocr-degraded` при `degraded`; [`extraction.ts`](vdp/fe/src/lib/ved/extraction.ts) `extractionTriggerLabel("pending")` → «Детали распознавания»
- Домен/API: без изменений
- Unit: `extraction.test.ts` (+ при необходимости forms-new)
- E2E: не расширять; поправить хрупкие ожидания текста если есть
- Compose: не требуется сверх gate

## Подход

При `ocrBannerState === "degraded"` на review показывать только review-баннер (или только progress) — один DOM-сигнал. Pending/done/auth_lost без регрессии.

## Корнеры

noDocuments; auth_lost; pending→degraded; e2e на старый текст кнопки.

## DoD / QG

1. `make check-env-parity`
2. FE unit затронутых тестов
3. `make ci-pr`
4. Acceptance на localhost
5. Строка в [замер-lead-time-неделя-2026-09-22.md](заметки/замер-lead-time-неделя-2026-09-22.md)
6. `notify-mgmt KIND=done` (продуктовый язык)
7. Todos + DoD `[x]` + status done в этом файле
