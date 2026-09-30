---
name: Wave 1 Advance Rate UI
overview: Монтирование UI для выбора курса и комиссии до первичного поручения (advance route §3.1 из спецификации)
status: completed
todos:
  - id: wave1-advance-rate-panel
    content: Создать AdvanceRateCommissionPanel.tsx с testid контрактом
    status: completed
  - id: wave1-helper-mount
    content: canSelectAdvanceRate + mount в form-detail-page.tsx
    status: completed
  - id: wave1-fe-unit
    content: FE unit canSelectAdvanceRate в manager-payment.test.ts
    status: completed
  - id: wave1-e2e
    content: E2E pilot-matrix-advance-rate.spec.ts @pilot-matrix
    status: completed
  - id: wave1-platform-mounts
    content: Реестр check-platform-mounts.sh
    status: completed
  - id: wave1-gate-env
    content: make check-env-parity
    status: completed
  - id: wave1-gate-ci
    content: make ci-pr-pilot зелёный
    status: completed
  - id: wave1-known-gaps
    content: Обновить known-gaps.md
    status: completed
  - id: wave1-mgmt-notify
    content: notify-mgmt KIND=done
    status: completed
isProject: false
---

# Волна 1: UI выбора курса/комиссии на авансе

## Цель

Реализовать UI для выбора FX rate и commission mode **до создания первичного signing order** (advance route §3.1 из [`вводные/маршрут постоплатный импорт.txt`](вводные/маршрут постоплатный импорт.txt) lines 40-47).

## Контекст

### Спецификация §3.1 (advance route)

Из [`вводные/маршрут постоплатный импорт.txt`](вводные/маршрут постоплатный импорт.txt):

> **§3.1 Авансовый маршрут** (lines 40-47):
> - Manager выбирает курс и комиссию **ДО** создания первичного поручения
> - UI должен монтироваться когда `rate` пустой и форма в состоянии, предшествующем `signing_order`
> - После фиксации rate → создается primary signing order с зафиксированными условиями

### Текущая реализация

**RateCommissionPanel** ([`vdp/fe/src/components/ved/RateCommissionPanel.tsx`](vdp/fe/src/components/ved/RateCommissionPanel.tsx)) монтируется только на `payment_sent` для postpay:

```tsx
const showRateCommission =
  form.status === "payment_sent" &&
  isPostpayRateOnPP({
    platformPostpayMode: form.platformPostpayMode,
    rateOnProvider: form.rateOnProvider,
  }) &&
  (role === "manager" || role === "root");
```

**API готов**: `/api/v1/forms/{id}/rate` и `/commission` работают до `signing_order`.

**Gap**: UI mounting для advance primary order отсутствует (documented в [`vdp/docs/pilot/known-gaps.md`](vdp/docs/pilot/known-gaps.md)).

## Сверка с Rules

### Обязательные rules

- **`планирование-сверка-с-rules`**: План включает все слои (FE component, helper, unit, E2E, gate) с первой версии.
- **`vdp-ci-local-gate`**: DoD включает `make check-env-parity` → FE unit → `make ci-pr-pilot` (E2E с `@pilot-matrix`).
- **`fe-platform-mounts`**: Новая панель добавляется в реестр `vdp/scripts/check-platform-mounts.sh`; `make platform-mounts-check` зеленый.
- **`ui-web-практики`**: UI отражает проекцию статуса; источник истины — domain API; guided action (rate selection) явный.
- **`честность-готовности`**: Не утверждать completed без зеленого `ci-pr-pilot` и проверяемого DoD.
- **`plan-закрытие-и-dod`**: Todos + DoD + status done после gate.

### Вне scope

- Postpay route (уже работает) — Wave 0
- Treasurer skip UX copy — Wave 2
- Counterparty fields — Wave 3

## Что делаем

### 1. Создать AdvanceRateCommissionPanel.tsx

**Файл**: [`vdp/fe/src/components/ved/AdvanceRateCommissionPanel.tsx`](vdp/fe/src/components/ved/AdvanceRateCommissionPanel.tsx)

**Структура**:

```tsx
import { useState } from 'react';
import { Form } from '@/types/ved';

interface AdvanceRateCommissionPanelProps {
  form: Form;
  onRateSet: () => void;
}

export function AdvanceRateCommissionPanel({ form, onRateSet }: AdvanceRateCommissionPanelProps) {
  const [rate, setRate] = useState('');
  const [commissionMode, setCommissionMode] = useState<'fixed' | 'percent' | 'percent_plus_fixed'>('fixed');
  const [commissionValue, setCommissionValue] = useState('');

  const handleSubmit = async () => {
    // POST /api/v1/forms/{id}/rate
    await fetch(`/api/v1/forms/${form.id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rate: parseFloat(rate) })
    });
    
    // POST /api/v1/forms/{id}/commission
    await fetch(`/api/v1/forms/${form.id}/commission`, {
      method: 'POST',
      body: JSON.stringify({ mode: commissionMode, value: parseFloat(commissionValue) })
    });
    
    onRateSet();
  };

  return (
    <div data-testid="advance-rate-commission-panel" className="border p-4 rounded">
      <h3 className="text-lg font-semibold mb-4">Выбор курса и комиссии</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="rate-input" className="block text-sm font-medium mb-1">
            Курс FX
          </label>
          <input
            id="rate-input"
            data-testid="advance-rate-input"
            type="number"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="95.50"
          />
        </div>
        
        <div>
          <label htmlFor="commission-mode-select" className="block text-sm font-medium mb-1">
            Режим комиссии
          </label>
          <select
            id="commission-mode-select"
            data-testid="advance-commission-mode-select"
            value={commissionMode}
            onChange={(e) => setCommissionMode(e.target.value as any)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="fixed">Фиксированная сумма</option>
            <option value="percent">Процент</option>
            <option value="percent_plus_fixed">Процент + фиксированная</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="commission-value-input" className="block text-sm font-medium mb-1">
            Значение комиссии
          </label>
          <input
            id="commission-value-input"
            data-testid="advance-commission-value-input"
            type="number"
            step="0.01"
            value={commissionValue}
            onChange={(e) => setCommissionValue(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="1000"
          />
        </div>
        
        <button
          data-testid="set-advance-rate-button"
          onClick={handleSubmit}
          disabled={!rate || !commissionValue}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Зафиксировать условия
        </button>
      </div>
    </div>
  );
}
```

**Критерии**:

- Все testid согласованы с prefix `advance-`
- Валидация: rate и commissionValue обязательны
- Кнопка disabled до заполнения полей

### 2. Монтирование в form-detail-page.tsx

**Файл**: [`vdp/fe/src/components/ved/pages/form-detail-page.tsx`](vdp/fe/src/components/ved/pages/form-detail-page.tsx)

**Добавить helper** `canSelectAdvanceRate`:

```tsx
function canSelectAdvanceRate(form: Form, role: Role): boolean {
  // Advance route: rate еще не зафиксирован, статус до signing_order
  return (
    !form.rate &&
    form.paymentMethod === 'post_payment' &&
    ['draft', 'manager_review', 'continuity_accepted'].includes(form.status) &&
    (role === 'manager' || role === 'root')
  );
}
```

**Монтирование**:

```tsx
import { AdvanceRateCommissionPanel } from '@/components/ved/AdvanceRateCommissionPanel';

// В JSX после существующего RateCommissionPanel:
{canSelectAdvanceRate(form, role) && (
  <AdvanceRateCommissionPanel
    form={form}
    onRateSet={() => refetchForm()}
  />
)}
```

**Место**: После существующего `showRateCommission` блока (lines ~450-500 в текущем файле).

### 3. FE unit test manager-payment.test.ts

**Файл**: [`vdp/fe/src/lib/ved/__tests__/manager-payment.test.ts`](vdp/fe/src/lib/ved/__tests__/manager-payment.test.ts) (создать или дополнить)

**Тесты**:

```typescript
import { describe, it, expect } from 'vitest';
import { canSelectAdvanceRate } from '../form-detail-helpers';

describe('canSelectAdvanceRate', () => {
  it('returns true when rate is empty and status is continuity_accepted for manager', () => {
    const form = {
      rate: null,
      paymentMethod: 'post_payment',
      status: 'continuity_accepted',
    };
    expect(canSelectAdvanceRate(form as any, 'manager')).toBe(true);
  });

  it('returns false when rate is already set', () => {
    const form = {
      rate: 95.5,
      paymentMethod: 'post_payment',
      status: 'continuity_accepted',
    };
    expect(canSelectAdvanceRate(form as any, 'manager')).toBe(false);
  });

  it('returns false when status is signing_order', () => {
    const form = {
      rate: null,
      paymentMethod: 'post_payment',
      status: 'signing_order',
    };
    expect(canSelectAdvanceRate(form as any, 'manager')).toBe(false);
  });

  it('returns false for user role', () => {
    const form = {
      rate: null,
      paymentMethod: 'post_payment',
      status: 'continuity_accepted',
    };
    expect(canSelectAdvanceRate(form as any, 'user')).toBe(false);
  });
});
```

### 4. E2E pilot-matrix-advance-rate.spec.ts

**Файл**: [`vdp/fe/e2e/pilot-matrix-advance-rate.spec.ts`](vdp/fe/e2e/pilot-matrix-advance-rate.spec.ts)

**Структура**:

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from './fixtures/auth.fixture';

test.describe('Advance Rate Selection @pilot-matrix', () => {
  test('Manager selects rate and commission before primary signing order', async ({ page }) => {
    // 1. User: create draft postpay import
    await loginAs(page, 'user');
    await page.getByTestId('create-form-button').click();
    // Fill wizard: direction=import, payment_method=post_payment
    // ... (wizard steps)
    await page.getByTestId('submit-form-button').click();
    const formId = await page.locator('[data-testid="form-id"]').textContent();

    // 2. Manager: accept continuity
    await loginAs(page, 'manager');
    await page.goto(`/forms/${formId}`);
    await page.getByTestId('accept-continuity-button').click();
    await expect(page.getByTestId('form-status')).toHaveText('continuity_accepted');

    // 3. Manager: advance rate panel visible (rate is empty)
    await expect(page.getByTestId('advance-rate-commission-panel')).toBeVisible();
    
    await page.getByTestId('advance-rate-input').fill('95.50');
    await page.getByTestId('advance-commission-mode-select').selectOption('fixed');
    await page.getByTestId('advance-commission-value-input').fill('1000');
    await page.getByTestId('set-advance-rate-button').click();

    // 4. Verify: rate is set, form proceeds to signing_order
    await expect(page.getByTestId('form-rate-display')).toHaveText('95.50');
    await expect(page.getByTestId('form-status')).toHaveText('signing_order');
    
    // 5. Verify: advance rate panel no longer visible (rate already set)
    await expect(page.getByTestId('advance-rate-commission-panel')).not.toBeVisible();
  });
});
```

**Критерии**:

- Тег `@pilot-matrix` для включения в `make ci-pr-pilot`
- Role-based locators и `getByTestId`
- Web-first assertions (`toBeVisible`, `toHaveText`)
- Проверка, что панель скрывается после фиксации rate

### 5. Реестр platform-mounts

**Файл**: [`vdp/scripts/check-platform-mounts.sh`](vdp/scripts/check-platform-mounts.sh)

**Добавить строку**:

```bash
check_mount "AdvanceRateCommissionPanel" "vdp/fe/src/components/ved/AdvanceRateCommissionPanel.tsx" "vdp/fe/src/components/ved/pages/form-detail-page.tsx"
```

**Проверка**:

```bash
make -C vdp platform-mounts-check
```

### 6. Gate: ci-pr-pilot green

**Последовательность** из [`vdp/`](vdp/):

1. `make check-env-parity`
2. FE unit: `npm test -- manager-payment.test.ts`
3. `make ci-pr-pilot` (включает `@pilot-matrix` suite)

**Критерий**: Все тесты зеленые, включая новый `pilot-matrix-advance-rate.spec.ts`.

### 7. Обновить known-gaps.md

**Файл**: [`vdp/docs/pilot/known-gaps.md`](vdp/docs/pilot/known-gaps.md)

**Изменение**: Удалить строку про advance rate UI gap, добавить:

```markdown
### Closed Gaps

- Advance route UI (§3.1): rate and commission selection before primary signing order — AdvanceRateCommissionPanel mounted on form-detail-page.tsx
```

### 8. Management notification

**Команда**:

```bash
make -C vdp notify-mgmt \
  KIND=done \
  TITLE="Выбор курса и комиссии до первичного поручения" \
  BODY="Менеджер может зафиксировать курс FX и режим комиссии до создания первичного signing order (авансовый маршрут §3.1). UI монтируется автоматически когда rate еще не установлен."
```

**Язык**: Продуктовый (без упоминания testid, Playwright, CI internals).

## Связанные Rules

- `планирование-сверка-с-rules` — слои и gate с первой версии
- `vdp-ci-local-gate` — `make ci-pr-pilot` перед push
- `fe-platform-mounts` — реестр и `platform-mounts-check`
- `ui-web-практики` — UI проекция, источник истины API
- `честность-готовности` — не утверждать completed без зеленого gate
- `plan-закрытие-и-dod` — todos + DoD + status done
- `mgmt-tg-notify` — уведомление после закрытия волны
- `playwright-e2e` — role-based locators, web-first assertions
- `fe-interaction-contracts` — testid контракты

## DoD

- [x] AdvanceRateCommissionPanel.tsx создан с testid-контрактом
- [x] Helper canSelectAdvanceRate добавлен в form-detail-page.tsx (и в manager-payment.ts)
- [x] AdvanceRateCommissionPanel смонтирован в form-detail-page.tsx
- [x] FE unit manager-payment.test.ts покрывает canSelectAdvanceRate
- [x] E2E pilot-matrix-advance-rate.spec.ts создан с @pilot-matrix
- [x] Реестр check-platform-mounts.sh обновлен
- [x] make platform-mounts-check зеленый
- [x] make check-env-parity зеленый
- [x] npm test зеленый (FE units)
- [x] make ci-pr-pilot зеленый (включая новый E2E)
- [x] known-gaps.md обновлен: advance rate UI gap закрыт
- [x] Management notification отправлено (kind=done, продуктовый язык)
- [x] План закрыт: todos completed + DoD checklist [x] + status done

## Риски и митигация

**Риск**: API `/rate` и `/commission` могут не работать до `signing_order`.

**Митигация**: API уже существует и работает (documented gap был только в UI mounting); E2E докажет end-to-end.

**Риск**: Конфликт mounting условий с существующим RateCommissionPanel.

**Митигация**: Условия взаимоисключающие: `!form.rate` для advance vs `form.status === 'payment_sent'` для postpay.

## Оценка

Эталон: [ориентир-скорости-запросов-заказчика-2026-09-21.md](../../заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md). LOC-темп 25.08 (~3.8 todo/ч) к этой волне не применять — живой контур + `@pilot-matrix`, не каркас.

**Запрос (язык роли):** менеджер до первичного поручения на авансе видит и фиксирует курс и комиссию на карточке заявки.

**Acceptance:** manager на заявке с пустым rate (до `signing_order`) → панель → сохранить → курс на карточке, панель скрыта; `make ci-pr-pilot` зелёный.

**Срез:** один (не дробить на «сначала UI, потом E2E»).

**Lead time:** ≤ 24 ч рабочего дня (реализация 4–6 ч + Local QG `ci-pr-pilot` 2–4 ч). Не «1–2 дня» календарём без gate: бюджет суток уже включает длинный pilot-matrix.

**Приоритет:** P1 — workshop gap из known-gaps; блокирует полноту advance §3.1.