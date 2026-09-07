---
name: RFC W6 Verify DoD
overview: "Закрытие программы: journey преемственности 1–4, регрессии W1–W5, стенд honesty — без ложного 100% паритета."
todos:
  - id: w6-unit-service
    content: "Прогон unit/service/http по mandatory, catalog, spine, AuthZ"
    status: pending
  - id: w6-fe-vitest
    content: "Vitest process-roles + admin form"
    status: pending
  - id: w6-journey-dod
    content: "Зафиксировать зелёный прогон критериев 1–4 (service и/или узкий e2e)"
    status: pending
  - id: w6-stand-check
    content: "Стенд: нет root в process-roles; inline UX; ICO off default; ручной U→M→P"
    status: pending
  - id: w6-master-close
    content: "Отметить master-w1…w6 completed только при зелёном DoD"
    status: pending
isProject: false
---

# RFC W6 — Verify / DoD honesty

**Мастер:** [roles_finalize_corrections_d10e6a7d.plan.md](roles_finalize_corrections_d10e6a7d.plan.md)  
**Зависимости:** W1–W5  
**Следующая:** нет (закрытие программы)

## Цель

Честно закрыть мастер: преемственность 1–4 проверяема; UI/API согласованы; без «паритет 100%».

## Сверка с `.cursor/rules`

Наследует матрицу мастера. Срез волны:

**Обязательны:** `планирование-сверка-с-rules`, `базовые-правила-инструмента`, `правила-построения`, `честность-готовности` (главный gate закрытия), `тесты-архитектуры` (unit/service + узкий journey; не «мороженое» E2E), `go-testing`, `use-cases` (преемственность 1–4 = journey ролей), `безопасность-ролей-и-данных`, `устойчивость-и-наблюдаемость`, `playwright-e2e` — **только** если уже есть стабильный узкий сценарий; иначе service journey достаточен; не раздувать матрицу браузеров.

**Вне scope волны:** полный Nest parity; docs без запроса; `nestjs-testing` / публичные `admin/test` smoke; ML; serverless; `vdp-fe-docker-пересборка` без явного «да»; BPM.

**Gate/DoD-чеки:** чеклист преемственности 1–4; регрессии W1–W5; master-w1…w6 completed только после факта; нет утверждения «паритет 100%»; нет новых публичных smoke endpoint’ов.


## Чеклист закрытия

### Преемственность

- [ ] 1 User → submit to manager
- [ ] 2 Manager → rework user **или** send provider
- [ ] 3 Provider → done **или** return manager
- [ ] 4 Enable optional (напр. ICO) → путь учитывает участника; 1–3 достижимы

### Регрессии

- [ ] Root отсутствует в GET/UI process-roles
- [ ] Mandatory toggle; disable blocked while mandatory
- [ ] Inline influence / в процессе
- [ ] Caps human titles из catalog
- [ ] User form 2B: template + overrides
- [ ] Pilot seed ICO/ECO off не soft-lock

### Honesty

- [ ] Master todos `master-w1`…`master-w6` = completed только после факта
- [ ] Не писать «completed / 100% Nest» в отчёте

## DoD W6

Все пункты чеклиста выше зелёные на CI и/или согласованном стенде.
