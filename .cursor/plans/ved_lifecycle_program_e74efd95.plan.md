---
name: VED lifecycle program
overview: "Программа планов BDUI для полного жизненного цикла заявки по 5 ролям ВИ в fe-experiment: общий каркас, затем сценарии по ролям, затем ветки. Канонический happy-path — import + аванс + товар."
todos:
  - id: exec-p0
    content: Выполнить план P0 — каркас lifecycle (матрица, seed, контракт BDUI)
    status: pending
  - id: exec-p1
    content: Выполнить план P1 — User create/submit wizard
    status: pending
  - id: exec-p2
    content: Выполнить план P2 — Internal CO
    status: pending
  - id: exec-p3
    content: Выполнить план P3 — External CO
    status: pending
  - id: exec-p4
    content: Выполнить план P4 — Manager
    status: pending
  - id: exec-p5
    content: Выполнить план P5 — Provider (+ узкий DTO)
    status: pending
  - id: exec-p6
    content: Выполнить план P6 — User close + Manager COMPLETED
    status: pending
  - id: exec-p7
    content: Выполнить план P7 — ветки corrections/cancel/постоплата
    status: pending
isProject: false
---

# Программа: полный lifecycle заявки (BDUI)

## Цель

Функциональный прогон заявки **от создания до `COMPLETED`** под всеми ролями ВИ (User, Internal CO, External CO, Manager, Provider), с корректными правами/ограничениями на каждом статусе. Визуал Neo360 не обязателен.

## Канонический happy-path (зафиксировано)

**Import + аванс + товар** — основной сквозной сценарий для планов P1–P6.  
Ветки corrections/cancel и **постоплата** — в отдельном плане P7 после зелёного happy-path.

## Рабочая зона

- Код: [`fe-experiment/`](fe-experiment/) (`backend-for-ved` + `bdui-client`)
- Вводные: [`вводные/вводные от ви.txt`](вводные/вводные%20от%20ви.txt)
- Вердикт API: [`заметки/вердикт-fea-stage-vf2.txt`](заметки/вердикт-fea-stage-vf2.txt)
- Правила: status machine + RBAC (`интеграция-и-события`, `безопасность-ролей-и-данных`, `правила-построения`), тесты (`nestjs-testing` / unit на resolvers), Provider без ПДн

## Карта планов (порядок исполнения)

| ID | План | Результат сегмента |
|----|------|-------------------|
| P0 | Каркас lifecycle | матрица `role×status→actions`, seed 5 ролей, расширенный контракт BDUI |
| P1 | User create/submit | wizard заявки → отправка на проверку |
| P2 | Internal CO | первая проверка РФ-организации |
| P3 | External CO | form accept / corrections / cancel |
| P4 | Manager | договор/поручение, назначение Provider, контроль |
| P5 | Provider | исполнение платежа + подтверждение (узкий DTO) |
| P6 | User close | подписи, оплата, отчёт/shipment → Manager `COMPLETED` |
| P7 | Ветки | corrections loop, cancel, постоплата (StageHash) |

Каждый план создаётся отдельным plan-файлом и содержит свой блок **«Проверка стабильности и качества»**.

## Сквозной критерий программы

После P0–P6: один ручной прогон под 5 аккаунтами доводит заявку до `COMPLETED` по каноническому path.  
После P7: corrections + один cancel + постоплата проходимы без ломания happy-path.

## Вне скоупа программы

TREASURER / ONE_C / ROOT / SENIOR_PROVIDER; pixel-perfect Figma; обязательный Diadoc как единственный путь подписания.
