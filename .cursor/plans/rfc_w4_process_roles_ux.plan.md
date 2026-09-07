---
name: RFC W4 Process Roles UX
overview: "Экран «Роли процесса»: inline влияние и «в процессе», toggle обязательная, человекопонятные права из catalog; root скрыт."
todos:
  - id: w4-api-client
    content: "process-roles.ts: mandatory, catalog types, update body influence/enabled/mandatory/caps"
    status: pending
  - id: w4-inline-controls
    content: "Inline select влияния + toggle «в процессе» + toggle обязательная; disable rules"
    status: pending
  - id: w4-human-caps
    content: "Колонка/редактор прав: title+description; id вторично (tooltip/mono)"
    status: pending
  - id: w4-copy-ux
    content: "Подписи: порядок≠этапы; правка глобальна; root вне процесса"
    status: pending
  - id: w4-vitest
    content: "Vitest: disable blocked when mandatory; labels render; no root row"
    status: pending
isProject: false
---

# RFC W4 — Process-roles UI (inline + human caps)

**Мастер:** [roles_finalize_corrections_d10e6a7d.plan.md](roles_finalize_corrections_d10e6a7d.plan.md)  
**Зависимости:** W2 (API+catalog), желательно W3 для смысла gate  
**Следующая:** W5

## Цель

Сделать экран из скрина (version N) **управляемым по месту**, а не read-only лейблами: влияние, участие в процессе, обязательная; права понятны не-разработчику.

## Сверка с `.cursor/rules`

Наследует матрицу мастера. Срез волны:

**Обязательны:** `планирование-сверка-с-rules`, `базовые-правила-инструмента`, `правила-построения`, `честность-готовности`, `ui-web-практики` (иерархия, один primary feedback, guided), `ux-взаимодействие-и-скорость` (Doherty / busy &lt;400ms feedback), `ux-когнитивная-нагрузка` (Hick — не перегружать caps), `ux-формы-навигация-онбординг` (Postel, лейблы ≠ placeholder), `поддержка-и-обратная-связь` (человекопонятные title/description прав — self-service), `безопасность-ролей-и-данных` (UI hide ≠ AuthZ; PUT всё равно с cap), `typescript-clean-code`, `интеграция-и-события` (экран не invents статус заявки).

**Вне scope волны:** форма пользователя (W5); BPM; `nestjs-*`; ML; `vdp-fe-docker-пересборка` без «да»; docs без запроса.

**Gate/DoD-чеки:** inline influence / в процессе / mandatory; caps из catalog; root hidden; disable blocked while mandatory; vitest; копирайт сканируемый.


## UX (по месту в таблице)

Файл: [`process-roles-page.tsx`](vdp/fe/src/components/ved/pages/process-roles-page.tsx)

| Колонка | Сейчас | Цель |
|---|---|---|
| Влияние | текст actor/observer | **select** actor / observer / none → PUT |
| В процессе | да/нет текст | **toggle** (да↔нет) ≡ enable/disable; disabled если mandatory && enabled |
| Обязательная | серый лейбл / «Обязательная» | **toggle** «Обязательная» → PUT mandatory; после снятия можно Отключить |
| Права | CSV `form.view,...` | список **title**; description в tooltip/popover; machine id мелко |
| Root | — | не показывать строку |

Дополнительно:

- Priority ↑↓ без изменений смысла (порядок ролей ≠ этапы).
- При смене influence=observer — UI не предлагает transition caps (или снимает с подтверждением) — паритет `ValidateRoleConfigUpdate`.
- Один primary feedback: toast/inline error при 400.
- Редактор caps: чекбоксы по catalog (title), не ручной CSV.

## Копирайт влияния (RU)

- actor — «Участник (может менять статус)»
- observer — «Наблюдатель (без смены статуса)»
- none — «Без влияния»

## DoD W4

- [ ] Inline influence + в процессе + mandatory работают против API
- [ ] Права показываются title/description из catalog
- [ ] Root отсутствует; disable blocked while mandatory
- [ ] Vitest на правила UI
