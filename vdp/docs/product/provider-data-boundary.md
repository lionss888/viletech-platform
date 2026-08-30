# Граница данных Provider

Provider-контур не получает ПДн клиента. Правило enforced в API DTO, FE ACL и copy layer RW7 RW9.

## Provider видит

Идентификатор заявки и платежа. Сумма и валюта. Реквизиты для исполнения: организация контрагента, INN где нужно, bank SWIFT, invoice reference.

Статус платежа в терминах provider copy: Платежи в исполнении, Платёж в работе.

Документы блока payment proof для attach confirmation.

## Provider не видит

Колонку Клиент в реестре. ownerName в search и CSV.

ФИО, паспорт, личные контакты досье.

RefundPanel и внутренние manager-only блоки.

Legal address participants block на карточке где скрыто ACL.

## UI copy запреты

Термины Клиент, паспорт, ownerName в labels helper text empty states. Проверка collectProviderPiiIssues в copy-consistency.test.ts.

## Functional ACL

RD7 provider-flow и e2e provider-acl.spec.ts. API compose-e2e provider payment start sent.

## Return to manager

prov_payment_return to manager_checking. Provider copy объясняет возврат на уточнение без раскрытия ПДн.

## Support

Support не должен передавать ПДн клиента provider через чат. Эскалация через auditable channel с AuthZ.
