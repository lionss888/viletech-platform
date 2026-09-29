---
name: Wave 3 Counterparty Fields
overview: Добавление полей регистрационного номера и юридического адреса контрагента в wizard и domain
todos:
  - id: wave3-domain
    content: counterparty.go + DB migration (RegistrationNumber, LegalAddress)
    status: pending
  - id: wave3-go-unit
    content: Go unit counterparty_test.go покрывает новые поля
    status: pending
  - id: wave3-fe-wizard
    content: "CounterpartyStep.tsx: два новых optional поля"
    status: pending
  - id: wave3-fe-unit
    content: FE unit counterparty.test.ts покрывает новые поля
    status: pending
  - id: wave3-e2e
    content: pilot-matrix-wizard.spec.ts с заполнением новых полей
    status: pending
  - id: wave3-gate-env
    content: Выполнить make check-env-parity из vdp/
    status: pending
  - id: wave3-gate-go
    content: Выполнить go test ./internal/domain/formpayment/... -v
    status: pending
  - id: wave3-gate-fe
    content: Выполнить npm test из vdp/fe
    status: pending
  - id: wave3-gate-ci
    content: Выполнить make ci-pr-pilot из vdp/
    status: pending
  - id: wave3-known-gaps
    content: "Обновить vdp/docs/pilot/known-gaps.md: counterparty fields closed"
    status: pending
  - id: wave3-mgmt-notify
    content: "Отправить management notification: make notify-mgmt KIND=done (продуктовый язык)"
    status: pending
isProject: false
---

# Волна 3: Поля контрагента (регистрационный номер и адрес)

## Цель

Добавить два optional поля контрагента в wizard и domain:

1. **Регистрационный номер** (Registration Number) — ОГРН / КПП / INN эквивалент
2. **Юридический адрес** (Legal Address) — полный адрес регистрации

## Контекст

### Спецификация §2

Из [`вводные/маршрут постоплатный импорт.txt`](вводные/маршрут постоплатный импорт.txt) §2 (Initiation):

> Поставщик:
> - Название организации
> - **Регистрационный номер** (новое поле)
> - **Юридический адрес** (новое поле)
> - Контактные данные

### Текущая реализация

**Domain**: [`vdp/core/internal/domain/formpayment/counterparty.go`](vdp/core/internal/domain/formpayment/counterparty.go)

```go
type Counterparty struct {
    Name    string
    Contact string
    // Новые поля:
    // RegistrationNumber string
    // LegalAddress       string
}
```

**Wizard**: [`vdp/fe/src/components/ved/wizard/CounterpartyStep.tsx`](vdp/fe/src/components/ved/wizard/CounterpartyStep.tsx)

**E2E**: [`vdp/fe/e2e/pilot-matrix-wizard.spec.ts`](vdp/fe/e2e/pilot-matrix-wizard.spec.ts) (заполнение counterparty)

## Сверка с Rules

### Обязательные rules

- **`планирование-сверка-с-rules`**: План включает все слои (domain + migration, FE wizard, Go unit, FE unit, E2E, gate) с первой версии.
- **`vdp-ci-local-gate`**: DoD включает `make check-env-parity` → Go unit → FE unit → `make ci-pr-pilot` (E2E с `@pilot-matrix`).
- **`go-testing`**: Table-driven unit tests для domain validation (RegistrationNumber / LegalAddress optional).
- **`честность-готовности`**: Не утверждать completed без зеленого `ci-pr-pilot` и проверяемого DoD.
- **`plan-закрытие-и-dod`**: Todos + DoD + status done после gate.

### Вне scope

- Postpay route E2E — Wave 0
- Advance rate UI — Wave 1
- Treasurer skip UX copy — Wave 2

## Что делаем

### 1. Domain: counterparty.go + DB migration

**Файл**: [`vdp/core/internal/domain/formpayment/counterparty.go`](vdp/core/internal/domain/formpayment/counterparty.go)

**Изменение**:

```go
type Counterparty struct {
    Name               string `json:"name"`
    Contact            string `json:"contact"`
    RegistrationNumber string `json:"registrationNumber,omitempty"` // optional
    LegalAddress       string `json:"legalAddress,omitempty"`       // optional
}
```

**Migration**: [`vdp/core/migrations/XXXXXX_add_counterparty_fields.sql`](vdp/core/migrations/)

```sql
ALTER TABLE counterparties
ADD COLUMN registration_number TEXT,
ADD COLUMN legal_address TEXT;
```

**Критерии**:

- Поля optional (не NOT NULL)
- JSON tags с `omitempty`
- Migration rollback-совместимая

### 2. Go unit: counterparty_test.go

**Файл**: [`vdp/core/internal/domain/formpayment/counterparty_test.go`](vdp/core/internal/domain/formpayment/counterparty_test.go)

**Тесты**:

```go
package formpayment_test

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "vdp/core/internal/domain/formpayment"
)

func TestCounterparty_WithOptionalFields(t *testing.T) {
    tests := []struct {
        name     string
        input    formpayment.Counterparty
        wantErr  bool
    }{
        {
            name: "all fields present",
            input: formpayment.Counterparty{
                Name:               "Supplier LLC",
                Contact:            "+7...",
                RegistrationNumber: "1234567890",
                LegalAddress:       "123 Main St, City",
            },
            wantErr: false,
        },
        {
            name: "optional fields empty",
            input: formpayment.Counterparty{
                Name:    "Supplier LLC",
                Contact: "+7...",
            },
            wantErr: false,
        },
    };

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := tt.input.Validate()
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        });
    }
}
```

**Критерии**: Table-driven, покрытие optional paths.

### 3. FE: CounterpartyStep.tsx

**Файл**: [`vdp/fe/src/components/ved/wizard/CounterpartyStep.tsx`](vdp/fe/src/components/ved/wizard/CounterpartyStep.tsx)

**Изменение**:

```tsx
export function CounterpartyStep({ value, onChange }: CounterpartyStepProps) {
  return (
    <div className="space-y-4">
      <Field label="Название организации" required>
        <input
          data-testid="counterparty-name-input"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </Field>

      <Field label="Контактные данные" required>
        <input
          data-testid="counterparty-contact-input"
          value={value.contact}
          onChange={(e) => onChange({ ...value, contact: e.target.value })}
        />
      </Field>

      {/* Новые поля */}
      <Field label="Регистрационный номер" optional>
        <input
          data-testid="counterparty-registration-number-input"
          value={value.registrationNumber || ''}
          onChange={(e) => onChange({ ...value, registrationNumber: e.target.value })}
          placeholder="ОГРН / ИНН / КПП"
        />
      </Field>

      <Field label="Юридический адрес" optional>
        <textarea
          data-testid="counterparty-legal-address-input"
          value={value.legalAddress || ''}
          onChange={(e) => onChange({ ...value, legalAddress: e.target.value })}
          placeholder="Полный адрес регистрации"
          rows={3}
        />
      </Field>
    </div>
  );
}
```

**Критерии**:

- testid для новых полей
- `optional` prop на Field
- placeholder подсказки

### 4. FE unit: counterparty.test.ts

**Файл**: [`vdp/fe/src/components/ved/wizard/__tests__/counterparty.test.ts`](vdp/fe/src/components/ved/wizard/__tests__/counterparty.test.ts)

**Тесты**:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CounterpartyStep } from '../CounterpartyStep';

describe('CounterpartyStep', () => {
  it('renders new optional fields', () => {
    render(<CounterpartyStep value={{}} onChange={() => {}} />);
    
    expect(screen.getByTestId('counterparty-registration-number-input')).toBeInTheDocument();
    expect(screen.getByTestId('counterparty-legal-address-input')).toBeInTheDocument();
  });

  it('calls onChange with registrationNumber when user types', () => {
    const onChange = vi.fn();
    render(<CounterpartyStep value={{ name: 'Supplier' }} onChange={onChange} />);
    
    const input = screen.getByTestId('counterparty-registration-number-input');
    fireEvent.change(input, { target: { value: '1234567890' } });
    
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ registrationNumber: '1234567890' })
    );
  });
});
```

**Критерии**: Покрытие новых полей, проверка onChange.

### 5. E2E: pilot-matrix-wizard.spec.ts

**Файл**: [`vdp/fe/e2e/pilot-matrix-wizard.spec.ts`](vdp/fe/e2e/pilot-matrix-wizard.spec.ts)

**Дополнить существующий тест**:

```typescript
test.describe('Form Wizard @pilot-matrix', () => {
  test('fills counterparty step with new optional fields', async ({ page }) => {
    await loginAs(page, 'user');
    await page.getByTestId('create-form-button').click();
    
    // ... навигация до CounterpartyStep
    
    await page.getByTestId('counterparty-name-input').fill('Supplier LLC');
    await page.getByTestId('counterparty-contact-input').fill('+7...');
    await page.getByTestId('counterparty-registration-number-input').fill('1234567890');
    await page.getByTestId('counterparty-legal-address-input').fill('123 Main St, Moscow');
    
    await page.getByTestId('wizard-next-button').click();
    
    // Проверка, что данные сохранились
    await page.getByTestId('wizard-review-step').waitFor();
    await expect(page.getByText('1234567890')).toBeVisible();
    await expect(page.getByText('123 Main St, Moscow')).toBeVisible();
  });
});
```

**Критерии**: Заполнение и проверка отображения новых полей.

### 6. Gate: ci-pr-pilot green

**Последовательность** из [`vdp/`](vdp/):

1. `make check-env-parity`
2. Go unit: `go test ./internal/domain/formpayment/... -v`
3. FE unit: `npm test -- counterparty.test.ts`
4. `make ci-pr-pilot` (включает `@pilot-matrix` E2E)

**Критерий**: Все тесты зеленые.

### 7. Обновить known-gaps.md

**Файл**: [`vdp/docs/pilot/known-gaps.md`](vdp/docs/pilot/known-gaps.md)

**Изменение**:

```markdown
### Closed Gaps

- Counterparty fields (§2): Registration Number and Legal Address added to wizard and domain
```

### 8. Management notification

```bash
make -C vdp notify-mgmt \
  KIND=done \
  TITLE="Регистрационный номер и адрес контрагента" \
  BODY="Добавлены дополнительные поля поставщика: регистрационный номер (ОГРН/ИНН/КПП) и юридический адрес. Поля необязательные, заполняются при создании заявки."
```

**Язык**: Продуктовый (без migration internals).

## Связанные Rules

- `планирование-сверка-с-rules`, `vdp-ci-local-gate`, `go-testing`, `честность-готовности`, `plan-закрытие-и-dod`, `mgmt-tg-notify`, `playwright-e2e`

## DoD

- [ ] counterparty.go: RegistrationNumber и LegalAddress добавлены
- [ ] DB migration создана и применима
- [ ] Go unit counterparty_test.go покрывает новые поля
- [ ] CounterpartyStep.tsx: два новых optional поля
- [ ] FE unit counterparty.test.ts покрывает новые поля
- [ ] pilot-matrix-wizard.spec.ts дополнен заполнением новых полей
- [ ] make check-env-parity зеленый
- [ ] go test зеленый (domain units)
- [ ] npm test зеленый (FE units)
- [ ] make ci-pr-pilot зеленый (включая E2E)
- [ ] known-gaps.md обновлен: counterparty fields gap закрыт
- [ ] Management notification отправлено (kind=done, продуктовый язык)
- [ ] План закрыт: todos completed + DoD checklist [x] + status done

## Риски и митигация

**Риск**: Migration может конфликтовать с существующими данными.

**Митигация**: Поля nullable, не требуют заполнения для старых заявок.

**Риск**: Wizard может быть слишком длинным с новыми полями.

**Митигация**: Поля optional и визуально отмечены как необязательные; не удлиняют критический путь.

## Оценка

Эталон: [ориентир-скорости-запросов-заказчика-2026-09-21.md](../../заметки/ориентир-скорости-запросов-заказчика-2026-09-21.md). LOC-темп 25.08 не применять. В одном push смешаны домен/migration и E2E ladder — QG к верхней границе суток.

**Запрос (язык роли):** клиент в мастере может указать регистрационный номер и юридический адрес поставщика (необязательно); поля сохраняются в заявке.

**Acceptance:** wizard → два optional поля → review показывает введённое; `make ci-pr-pilot` зелёный (в т.ч. wizard/pilot).

**Срез:** один целевой на сутки. Если migration + полный pilot начнут срывать fail-fast — вынести E2E-дополнение во второй срез того же запроса (не оставлять «готово» без Acceptance).

**Lead time:** ≤ 24 ч (реализация 4–6 ч + Local QG `ci-pr-pilot` 2–4 ч). Не обещать «полдня»: есть Go migration и `@pilot-matrix`.

**Приоритет:** P3 — §2 спецификации; не блокер core flow постоплаты.