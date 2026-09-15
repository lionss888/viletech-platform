---
name: Docs comments money path
overview: "Контракт money-path в GoDoc/JSDoc, не % комментариев: treasurer, rate, commission handlers."
todos:
  - id: comments-godoc-money
    content: GoDoc TreasurerConfirmPayment, SetCommission, rate handlers
    status: completed
  - id: comments-jsdoc-api
    content: JSDoc публичные confirmTreasurerPayment, setRate, setCommission в forms.ts
    status: completed
isProject: false
---

# Docs comments money path

Контракт money-path в GoDoc/JSDoc, не % комментариев.

## Цель

Читаемость money-path, не % строк с `//`.

## Факты

Package [`formpayment/doc.go`](../../vdp/core/internal/domain/formpayment/doc.go) и exports в actions/machine уже с GoDoc.

## Работы

### 1. GoDoc

[`TreasurerConfirmPayment`](../../vdp/core/internal/service/form_payment_nest.go), HTTP `handleTreasurerConfirmPayment`, `SetCommission` / rate handlers — когда, кто (роль), куда статус (advance vs postpay).

Файлы:
- `vdp/core/internal/service/form_payment_nest.go`
- `vdp/core/internal/transport/http/nest_form_routes.go`
- `vdp/core/internal/service/form_payment.go` (`SetCommission`)
- `vdp/core/internal/transport/http/r6_rate_docs_routes.go` (rate handlers)

### 2. JSDoc

Публичные `confirmTreasurerPayment`, `setRate`, `setCommission` в [`forms.ts`](../../vdp/fe/src/lib/api/forms.ts).

Формат:
```typescript
/**
 * Treasurer confirms RUB coverage for import advance (§10.2).
 * Transition: payment_received → payment_processing (advance) | report_waiting (postpay RATE_ON_PP).
 * @param formId - Form ID
 * @param input - Optional execution_deadline
 */
export function confirmTreasurerPayment(...)
```

### 3. Без новых markdown-программ

Без новых markdown-программ и без комментариев «что делает очевидная строка».

## DoD

- [ ] Экспортируемые money-path точки с контрактом
- [ ] Review без шума

## Сверка с rules

**Обязательны:** `go-architecture`, `правила-построения` (самопроверка), без плодения markdown.

**Вне scope:** комментирование private helpers, новая документация вне GoDoc/JSDoc.
