---
name: P7 Lifecycle branches
overview: "Ветки после happy-path: corrections loop, cancel по ролям, постоплата StageHash; точечные расширения из Флоу оплаты ВЭД без ломки P1–P6."
todos:
  - id: p7-corrections-cancel
    content: Corrections + cancel branches in matrix/UI
    status: completed
  - id: p7-postpay
    content: Postpay StageHash path checklist + BDUI actions
    status: completed
  - id: p7-qa
    content: "QA gate: branches + regression happy-path"
    status: completed
isProject: false
---

# P7 — Ветки lifecycle

## Зависимость

После зелёного **P6** (happy-path import+аванс до COMPLETED).

## Цель

Не ломая happy-path, добавить обязательные ветки ВИ и минимальные расширения оплаты.

## Scope

1. **Corrections loop:** ECO/Manager reject → User edit → resubmit (`accept-corrections`) → снова очередь
2. **Cancel:** User / External CO / Internal CO / Manager — терминальные статусы; UI без дальнейших mutate
3. **Постоплата (import + postpay):** StageHash без/с другим порядком shipment vs report; отдельный чеклист
4. Из [`вводные/Флоу оплаты ВЭД.txt`](вводные/Флоу%20оплаты%20ВЭД.txt) в P7 по минимуму: ручное прикрепление договора менеджером с авто-подтверждением **или** advance signing order — только если уже есть API; иначе зафиксировать gap в NOTES
5. Вне: субагент/услуги как полные типы; банк API; возврат ДС (отдельный эпик)

## Проверка стабильности и качества

1. Unit: resolvers для corrections/cancel/postpay статусов
2. Ручной: один полный corrections round-trip ECO↔User
3. Ручной: по одному cancel на User и на ECO; заявка не редактируется
4. Ручной: постоплата до COMPLETED (или документированный blocker API)
5. Регрессия: повторный happy-path P6 всё ещё проходит
6. Самопроверка StageHash import advance vs postpay
