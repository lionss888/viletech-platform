---
name: CS-R1 ops forms CTA
overview: "Дозакрыть проверку-среды на живых заявках: лестницы оплаты и ветки CTA; обновить проверку-среды.txt. Без смены домена."
todos:
  - id: r1-env-up
    content: "Убедиться что localhost compose fe/core healthy"
    status: pending
  - id: r1-seed-forms
    content: "Создать или посеять заявки под advance / postpay / export и ветки"
    status: pending
  - id: r1-cta-ladders
    content: "Пройти CTA денежных лестниц и corrections/refund/shipment где доступно"
    status: pending
  - id: r1-midflight-roles
    content: "Проверить mid-flight: смена process-roles root не мигрирует статус заявки"
    status: pending
  - id: r1-update-report
    content: "Обновить заметки/конструктор-сценариев/проверка-среды.txt — прошло / не прошло"
    status: pending
isProject: false
---

# CS-R1 — проверка среды на живых заявках

Родитель: [конструктор_реализация_889c3d6f.plan.md](конструктор_реализация_889c3d6f.plan.md).  
Опора: [заметки/конструктор-сценариев/проверка-среды.txt](заметки/конструктор-сценариев/проверка-среды.txt) (сейчас частично прошло).

## Цель

Закрыть пробелы пунктов 4–6 проверки среды: живые заявки + CTA лестниц/веток + mid-flight process-roles. Итог — обновлённый статус в `проверка-среды.txt`.

## Слои

| Слой | IN / OUT |
|---|---|
| Compose / repro | IN |
| Docs (заметки) | IN — обновить отчёт |
| UI / FE / домен / API / unit / E2E | OUT — без продуктового кода |

## Шаги

1. Стек: `vdp-fe`, `vdp-core` healthy; FE :5173, health core.
2. Создать или посеять заявки (seed / API / UI) так, чтобы были пути advance, postpay/RATE_ON_PP, export PAY_FROM_EXPORT по возможности.
3. В кабинете менеджера: CTA веток corrections / refund / shipment (если статус допускает) — жест и допустимый переход.
4. Root меняет process-roles; убедиться, что статус уже идущей заявки не прыгает сам (version stamp).
5. Переписать итог в `проверка-среды.txt`: **прошло** или **не прошло** + что смотреть.

## DoD

- В отчёте нет «не проверено на живой заявке» без явной причины (среда down / блокер).
- Главная приёмка: человек читает отчёт → ок / правки.
- Gate make не обязателен (только заметки + ручной repro).

## Вне scope

BPM; смена статусной машины; CS-R2 E2E; release-gate (CS-R3).

## Сверка rules

`честность-готовности`, `use-cases`, `безопасность-ролей-и-данных`, `интеграция-и-события` (не ломать mid-flight).
