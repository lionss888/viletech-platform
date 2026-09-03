---
name: Intake master index
overview: "Собрать программу «поток вводных» в один мастер-индекс IN0–IN3 (как RD/RH) и четыре дочерних плана. Дубль W0 в двух файлах убрать: исполняется только IN0."
todos:
  - id: rewrite-master
    content: Переписать tg_intake_pipeline в тонкий мастер-индекс IN0–IN3
    status: pending
  - id: enrich-in0
    content: Дополнить IN0 деталями W0 из большого плана; ссылка на мастер
    status: pending
  - id: create-in1-in3
    content: Создать дочерние планы IN1, IN2, IN3 из секций W1–W3
    status: pending
isProject: false
---

# Поток вводных: мастер + дочерние планы

Это **сборка планов**, не код Go. Модуля [`инструменты/поток-вводных/`](инструменты/поток-вводных/) ещё нет. [`delivery_pipeline_console_8545f54c.plan.md`](.cursor/plans/delivery_pipeline_console_8545f54c.plan.md) — другая программа (поставка VDP); в этот индекс не входит.

Шаблон как у [`vdp_role_debug_master.plan.md`](.cursor/plans/vdp_role_debug_master.plan.md) / [`rd0_role_debug_gate.plan.md`](.cursor/plans/rd0_role_debug_gate.plan.md): мастер не исполнять целиком; работать дочерним файлом.

## Что сейчас путает

- [`tg_intake_pipeline_8f8217bc.plan.md`](.cursor/plans/tg_intake_pipeline_8f8217bc.plan.md) — и программа W0–W3, и детали W0.
- [`in0_intake_transport_da671411.plan.md`](.cursor/plans/in0_intake_transport_da671411.plan.md) — тот же W0 под именем IN0.

Исполнять W0 дважды нельзя.

## Целевая карта

```mermaid
flowchart LR
  IN0[IN0_transport]
  IN1[IN1_contract]
  IN2[IN2_interpret]
  IN3[IN3_wave_draft]
  IN0 --> IN1 --> IN2 --> IN3
  IN3 --> human[human_approve]
```

| ID | Файл | Роль |
|----|------|------|
| **Master** | переписать `tg_intake_pipeline_8f8217bc.plan.md` | индекс, зависимости, глобальный DoD, честность % |
| **IN0** | оставить `in0_intake_transport_da671411.plan.md` | первая исполняемая волна |
| **IN1** | новый `in1_intake_contract_*.plan.md` | soft-parse / `needs_clarify` |
| **IN2** | новый `in2_intake_interpret_*.plan.md` | карточка, один вопрос в чат |
| **IN3** | новый `in3_intake_wave_*.plan.md` | WSJF-lite, draft `.cursor/plans/`, человек утверждает |

Имена волн: **IN0–IN3** (не W0). В тексте мастера: «IN0 = бывший W0».

## Мастер (тонкий)

Переписать [`tg_intake_pipeline_8f8217bc.plan.md`](.cursor/plans/tg_intake_pipeline_8f8217bc.plan.md):

- overview: индекс IN0–IN3; не исполнять целиком.
- todos мастера: только трекинг статусов детей + глобальный DoD (не копировать 8 технических todos IN0).
- цель, бот `@vdp_intake_bot`, чат `-5437125886`, граница `инструменты/поток-вводных/`, не трогать `vdp/hub`.
- таблица детей со status/зависимостями.
- сверка с rules **один раз** на программу (как сейчас в большом плане).
- mermaid + «первый шаг = IN0».
- убрать из мастера checklist Docker/CI/полей jsonl — это только IN0.

## IN0 (исполняемый срез)

Дополнить [`in0_intake_transport_da671411.plan.md`](.cursor/plans/in0_intake_transport_da671411.plan.md) тем, что сейчас есть только в большом плане и нужно для DoD:

- слои `cmd/intake`, `internal/{telegram,normalize,redact,store,config}`;
- HTTP timeout, backoff 429/5xx; файл — истина; ack best-effort;
- `TELEGRAM_INTAKE_CHAT_IDS` как список; любой участник allowlist-чата;
- seen `~/.vdp-intake/seen/update_ids`;
- job `intake` в [`.gitlab-ci.yml`](.gitlab-ci.yml), Go 1.22, не раздувать `fast`;
- compose **в модуле**, не [`vdp/docker-compose.yml`](vdp/docker-compose.yml).

Todos IN0 без изменений по смыслу (module / pipeline / docker / ci / botfather). Status: pending, кода нет.

## IN1 / IN2 / IN3 (новые файлы)

Содержание — секции W1–W3 из текущего большого плана, в формате RD0 (Meta / Scope In-Out / Rules / DoD / Status pending).

- **IN1:** шаблон уже в `/help` (IN0); soft-parse свободного `/vvod`; ужесточение после 5–10 реальных (redact) сообщений; unit на теги/поля; фикстуры без ПДн.
- **IN2:** `bug|gap|change|confused|noise`; card id `chat_id:message_id`; один вопрос бота в тот же чат; low confidence не в wave; HITL, не ML как истина.
- **IN3:** P0–P3 + WSJF-lite, size 1/3/5, ориентир [`заметки/ориентир-скорости-2026-08-25.md`](заметки/ориентир-скорости-2026-08-25.md); draft plan, **всегда** утверждает человек; 2–3 дня режут scope, не gate.

Зависимости: IN1 после DoD IN0; IN2 после IN1; IN3 после IN2.

## Сверка с `.cursor/rules`

**Обязательны для сборки планов:** `планирование-сверка-с-rules`, `базовые-правила-инструмента`, `честность-готовности` (не писать «пайплайн готов»), `правила-построения`.

**Обязательны в тексте детей (как политика программы, без кода в этой задаче):** `границы-и-контексты`, `screaming-architecture`, `детали-как-плагины`, `безопасность-ролей-и-данных`, `интеграция-и-события`, `устойчивость-и-наблюдаемость`, `развертывание-и-доставка`, `go-*`, `тесты-архитектуры`.

**Вне scope этой сборки:** реализация модуля, BotFather руками, `vdp-fe-docker-пересборка`, nestjs, playwright, статусы заявки продукта.

**Gate:** после сборки в репо ровно один исполняемый срез на транспорт (IN0); мастер без дублирующих todos W0.

## DoD этой задачи

- Мастер — индекс со ссылками на IN0–IN3.
- IN0 — полный W0, ссылка на мастер.
- IN1–IN3 существуют, pending, не смешаны с IN0.
- Нет двух «сделай getUpdates» в разных файлах как параллельных очередей.
