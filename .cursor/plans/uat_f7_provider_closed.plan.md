---
name: UAT F7 provider closed
overview: "Пункт 7: провайдер должен видеть назначенную завершённую заявку в реестре / счётчике «Закрыто» — снять FE over-filter visibleForms."
todos:
  - id: f7-repro
    content: "Localhost: completed + assigned provider — пустой реестр (baseline)"
    status: pending
  - id: f7-filter
    content: "visibleForms(provider): включать completed (+ cancel?) для assigned; обновить visible-forms.test"
    status: pending
  - id: f7-chips
    content: Сверить счётчик «Закрыто» / stage chip с новым scoped набором
    status: pending
  - id: f7-qg
    content: check-env-parity → ci-pr (+ e2e при нужде); close DoD + notify
    status: pending
isProject: false
---

# UAT F7: провайдер видит закрытую заявку

## Источник

Провайдер: все счётчики 0, таблица пустая; футер «сделок в системе: 1». Менеджер и клиент видят `ВЭД-cc50286b` · «Завершено».

## Вердикт по коду

- Core ACL: [CanSeeForm](vdp/core/internal/domain/formpayment/actions.go) — provider видит assigned при **любом** статусе; List не режет completed.
- FE over-filter: [store.tsx](vdp/fe/src/lib/ved/store.tsx) `visibleForms` — `role === "provider"` → `status.startsWith("payment")` — **исключает `completed`**.
- Тест закрепляет баг: [visible-forms.test.ts](vdp/fe/src/lib/ved/visible-forms.test.ts) «provider sees payment-stage forms only».

## Цель

Назначенный провайдер видит завершённые (и при необходимости свои отменённые) заявки в реестре и в «Закрыто».

## Scope

- Расширить `visibleForms` для provider: `payment*` **или** `completed` (и явно решить cancel-статусы: включать assigned cancel в «Закрыто»).
- Обновить unit; проверить chips/счётчики на [forms-list-page.tsx](vdp/fe/src/components/ved/pages/forms-list-page.tsx).
- Не отдавать ПДн (provider-acl без изменений политики данных).

## Вне scope

- Показ чужих (не assigned) заявок провайдеру.
- Смена core CanSeeForm.

## Слои

- FE: store `visibleForms`, list chips, tests.
- UI: реестр/счётчик «Закрыто».
- API/домен: без изменений (уже отдают assigned completed).
- Unit + optional e2e provider registry.
- Compose localhost.
- notify + handoff sync.

## Rules

**Обязательны:** `планирование-сверка-с-rules`, `plan-закрытие-и-dod`, `честность-готовности`, `ui-проблема-сразу-воспроизведи`, `безопасность-ролей-и-данных`, `use-cases`, `интеграция-и-события`, `playwright-e2e`, `тесты-архитектуры`, `vdp-ci-local-gate`, `mgmt-tg-notify`.

## DoD / QG

- [ ] Localhost: provider видит completed assigned
- [ ] `make check-env-parity`
- [ ] Unit visibleForms обновлён
- [ ] `make ci-pr` (новый e2e вне smoke → `ci-main`)
- [ ] DoD/todos; sync-handoff-queue; notify-mgmt

## Accept

- После happy-path close провайдер: «Закрыто» ≥ 1 и строка в реестре при «Все статусы».
- Чужие заявки не появляются.
- Provider detail по-прежнему без ПДн клиента.
