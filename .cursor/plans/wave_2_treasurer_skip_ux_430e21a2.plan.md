---
name: Wave 2 Treasurer Skip UX
overview: Рефакторинг UX copy для устранения упоминаний казначея при skip disposition
todos:
  - id: wave2-action-panel
    content: "ActionPanel.tsx: скрыть 'awaits treasurer' banner при skip"
    status: completed
  - id: wave2-status-copy
    content: "status-copy.ts: fallback copy при treasurer skip"
    status: completed
  - id: wave2-unit
    content: FE unit process-role-filter.test.ts покрывает treasurerOpsRecipient + copy
    status: completed
  - id: wave2-gate-env
    content: Выполнить make check-env-parity из vdp/
    status: completed
  - id: wave2-gate-unit
    content: Выполнить npm test из vdp/fe (FE units)
    status: completed
  - id: wave2-gate-ci
    content: Выполнить make ci-pr из vdp/ (E2E не требуется, но не ломается)
    status: completed
  - id: wave2-mgmt-notify
    content: "Отправить management notification: make notify-mgmt KIND=done (продуктовый язык)"
    status: completed
isProject: false
---

# Волна 2: UX copy без упоминания казначея при skip

## Цель

Убрать из UI упоминания казначея ("awaiting treasurer", "казначей проверяет") когда treasurer отключен через `disable_mode: "skip"` и Manager получает `CapTreasurerOps`.

## Контекст

### Treasurer Skip Disposition

Конфигурация через API `/api/v1/admin/process-roles/treasurer`:

```json
{
  "enabled": false,
  "disable_mode": "skip",
  "handoff_role": null
}
```

**Эффект**: Manager получает `CapTreasurerOps` и может выполнять `treas_confirm_payment` (источник: [`vdp/core/internal/domain/formpayment/role_config.go`](vdp/core/internal/domain/formpayment/role_config.go), `TreasurerOpsRecipient`).

**Проблема**: UI текст/кнопки продолжают упоминать "казначей" даже при skip:

- ActionPanel может показывать "Awaiting Treasurer" banner
- status-copy.ts может возвращать "Ожидается подтверждение казначея"
- Менеджер видит кнопку "Подтвердить поступление", но сопровождающий текст упоминает роль, которая отключена

### Текущая реализация

**process-role-filter.ts** ([`vdp/fe/src/lib/ved/process-role-filter.ts`](vdp/fe/src/lib/ved/process-role-filter.ts)) уже корректно гранчит `CapTreasurerOps` при skip.

**ActionPanel.tsx** ([`vdp/fe/src/components/ved/ActionPanel.tsx`](vdp/fe/src/components/ved/ActionPanel.tsx)) и **status-copy.ts** ([`vdp/fe/src/lib/ved/status-copy.ts`](vdp/fe/src/lib/ved/status-copy.ts)) НЕ учитывают treasurer disposition.

## Сверка с Rules

### Обязательные rules

- **`планирование-сверка-с-rules`**: План включает все слои (FE copy, helper, unit, gate) с первой версии.
- **`vdp-ci-local-gate`**: DoD включает `make check-env-parity` → FE unit → `make ci-pr` (E2E не требуется для copy, но не ломается).
- **`ui-web-практики`**: UX copy ясный, термины согласованы; не вводит в заблуждение о роли, которая не участвует.
- **`честность-готовности`**: Не утверждать completed без зеленого gate и проверяемого DoD.
- **`plan-закрытие-и-dod`**: Todos + DoD + status done после gate.

### Вне scope

- Postpay route E2E — Wave 0
- Advance rate UI — Wave 1
- Counterparty fields — Wave 3

## Что делаем

### 1. ActionPanel.tsx: скрыть "awaits treasurer" banner при skip

**Файл**: [`vdp/fe/src/components/ved/ActionPanel.tsx`](vdp/fe/src/components/ved/ActionPanel.tsx)

**Изменение**:

```tsx
// До:
const showTreasurerBanner = form.status === 'advance_payment_sent' || form.status === 'awaiting_treasurer_confirmation';

// После:
function showTreasurerBanner(form: Form, processRoles: ProcessRolesConfig): boolean {
  if (!['advance_payment_sent', 'awaiting_treasurer_confirmation'].includes(form.status)) {
    return false;
  }
  // Скрыть banner, если treasurer в skip disposition
  return processRoles.treasurer.enabled || processRoles.treasurer.disable_mode !== 'skip';
}
```

**Использование**:

```tsx
{showTreasurerBanner(form, processRoles) && (
  <Banner variant="info" data-testid="awaits-treasurer-banner">
    Ожидается подтверждение казначея
  </Banner>
)}
```

**Критерии**:

- `processRoles` пробрасывается через props или context
- testid `awaits-treasurer-banner` для проверки отсутствия

### 2. status-copy.ts: fallback copy при treasurer skip

**Файл**: [`vdp/fe/src/lib/ved/status-copy.ts`](vdp/fe/src/lib/ved/status-copy.ts)

**Изменение**:

```typescript
export function getStatusCopy(status: FormStatus, processRoles: ProcessRolesConfig, role: Role): string {
  const treasurerSkipped = !processRoles.treasurer.enabled && processRoles.treasurer.disable_mode === 'skip';

  switch (status) {
    case 'advance_payment_sent':
      if (treasurerSkipped) {
        return role === 'manager' || role === 'root'
          ? 'Подтвердите поступление средств'
          : 'Ожидается подтверждение поступления средств';
      }
      return 'Ожидается подтверждение казначея';

    case 'awaiting_treasurer_confirmation':
      if (treasurerSkipped) {
        return 'Ожидается подтверждение менеджера';
      }
      return 'Ожидается подтверждение казначея';

    // ... остальные статусы без изменений
    default:
      return status;
  }
}
```

**Критерии**:

- `processRoles` — обязательный параметр
- fallback для статусов, упоминающих казначея
- role-aware: Manager vs User видят разные copy

### 3. FE unit process-role-filter.test.ts

**Файл**: [`vdp/fe/src/lib/ved/__tests__/process-role-filter.test.ts`](vdp/fe/src/lib/ved/__tests__/process-role-filter.test.ts)

**Дополнить тесты**:

```typescript
import { describe, it, expect } from 'vitest';
import { getStatusCopy } from '../status-copy';

describe('getStatusCopy with treasurer skip', () => {
  const processRoles = {
    treasurer: { enabled: false, disable_mode: 'skip' },
    // ... остальные роли
  };

  it('returns manager-focused copy for advance_payment_sent when treasurer is skipped', () => {
    expect(getStatusCopy('advance_payment_sent', processRoles, 'manager'))
      .toBe('Подтвердите поступление средств');
  });

  it('does not mention treasurer for user when treasurer is skipped', () => {
    const copy = getStatusCopy('advance_payment_sent', processRoles, 'user');
    expect(copy).not.toContain('казначе');
  });

  it('returns treasurer mention when treasurer is enabled', () => {
    const enabledRoles = {
      treasurer: { enabled: true, disable_mode: null },
    };
    expect(getStatusCopy('advance_payment_sent', enabledRoles, 'user'))
      .toContain('казначе');
  });
});
```

**Критерии**: Покрытие `skip` disposition и enabled=true fallback.

### 4. Gate: ci-pr green

**Последовательность** из [`vdp/`](vdp/):

1. `make check-env-parity`
2. FE unit: `npm test -- process-role-filter.test.ts status-copy.test.ts`
3. `make ci-pr` (E2E не требуется для copy, но не должно ломаться)

**Критерий**: Все тесты зеленые.

### 5. Management notification

```bash
make -C vdp notify-mgmt \
  KIND=done \
  TITLE="UX без упоминания казначея при skip disposition" \
  BODY="Интерфейс корректно отображает статусы и действия когда казначей отключен. Менеджер видит понятные инструкции без ссылок на роль, которая не участвует в процессе."
```

**Язык**: Продуктовый (без testid, disposition internals).

## Связанные Rules

- `планирование-сверка-с-rules`, `vdp-ci-local-gate`, `ui-web-практики`, `честность-готовности`, `plan-закрытие-и-dod`, `mgmt-tg-notify`

## DoD

- [ ] ActionPanel.tsx: showTreasurerBanner учитывает skip disposition
- [ ] status-copy.ts: getStatusCopy с fallback copy при treasurer skip
- [ ] FE unit process-role-filter.test.ts покрывает treasurerOpsRecipient + copy
- [ ] make check-env-parity зеленый
- [ ] npm test зеленый (FE units)
- [ ] make ci-pr зеленый (E2E не требуется, но не ломается)
- [ ] Management notification отправлено (kind=done, продуктовый язык)
- [ ] План закрыт: todos completed + DoD checklist [x] + status done

## Риски и митигация

**Риск**: `processRoles` может быть недоступен в ActionPanel context.

**Митигация**: Либо добавить в context, либо пробросить через props; уже есть прецедент использования `processRoles` в `process-role-filter.ts`.

**Риск**: E2E может сломаться, если тесты ожидают "awaits treasurer" текст.

**Митигация**: Волна 0 покрывает E2E с treasurer skip; новые тесты должны проверять отсутствие устаревшего copy.

## Оценка

Эталон: [ориентир-скорости-запросов-заказчика-2026-09-21.md](../../заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md). LOC-темп 25.08 к copy-срезу не применять.

**Запрос (язык роли):** при отключённом казначее (skip) менеджер и клиент не видят текстов «ждёт казначея»; CTA и статус говорят о подтверждении поступления.

**Acceptance:** process-roles treasurer skip → на `advance_payment_sent` / payment_received нет баннера «казначей»; copy статуса без «казначе»; `make ci-pr` зелёный.

**Срез:** один, узкий (FE copy + unit; без нового `@pilot-matrix` вне уже закрытой Волны 0).

**Lead time:** ≤ 0.5–1 рабочего дня (реализация 2–4 ч + Local QG `ci-pr` 1–2 ч). Укладывается в суточный ритм с запасом; не раздувать до «дня на рефакторинг».

**Приоритет:** P2 — ясность UX при 3 ролях; не блокер денежного пути.