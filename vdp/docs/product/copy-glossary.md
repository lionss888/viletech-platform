# Глоссарий UI copy

Канон = status id, action id, UI entity. Меняются только label, subtitle, empty, confirm. Root superadmin вне scope RW copy. Синхронизировано с RW9 gate copy-consistency.test.ts.

## Primary term User

Роль user. Термин заявка. Реестр Мои заявки. Completed Сделка закрыта.

## Primary term ICO

Роль ico. Термин заявка и организация.

## Primary term ECO

Роль eco. Термин сделка. Очередь сделок N.

## Primary term Manager

Роль manager. Термин сделка. CTA Закрыть сделку.

## Primary term Provider

Роль provider. Термин платеж. Реестр Платежи в исполнении.

## Primary term Bank channel

Не роль кабинета. Термин канал Bank API. Badge webhook correlation.

## Статус draft

Канон draft. Fallback Черновик. User Черновик заявки.

## Статус organization_waiting_verification

Канон organization_waiting_verification. Fallback Ожидает проверки организации. User Отправлено на проверку компании. ICO В очереди на верификацию организации.

## Статус form_waiting_verification

Канон form_waiting_verification. User Заявка на проверке. ECO В очереди на проверку сделки.

## Статус form_accepted

Канон form_accepted. User Заявка принята. ECO Сделка подтверждена. Manager Готова к сопровождению.

## Статус payment_received

Канон payment_received. User Средства получены оператором. Manager ДС получены. Provider Платёж передан в исполнение.

## Статус payment_processing

Канон payment_processing. User Платёж исполняется. Manager В исполнении у провайдера. Provider Платёж в работе.

## Статус payment_sent

Канон payment_sent. Все роли на handoff используют согласованный label Платёж отправлен. RW9 gate COPY_JOURNEY проверяет alignment.

## Статус manager_checking

Канон manager_checking. User Платёж на уточнении. Manager Платёж на уточнении у провайдера. Provider return path без ПДн.

## Статус completed

Канон completed. User Сделка закрыта. Manager Сделка закрыта.

## Действие accept_form

User Отправить заявку на проверку.

## Действие ico_form_start

ICO Взять организацию или заявку в проверку.

## Действие eco_form_accept

ECO Подтвердить условия сделки.

## Действие mgr_assign_provider

Manager Назначить провайдера исполнения.

## Действие mgr_payment_start

Manager Передать в исполнение. Gated until provider_id on payment_received.

## Действие mgr_refund_init

Manager Инициировать возврат ДС.

## Действие mgr_completed

Manager Закрыть сделку.

## Действие prov_payment_sent

Provider Подтвердить отправку платежа.

## Действие prov_attach_proof

Provider Прикрепить подтверждение платёжка или хеш.

## Навигация forms User

Мои заявки.

## Навигация forms ICO ECO

Входящие на проверку.

## Навигация forms Provider

Платежи в исполнении.

## Bank badge

Канал Bank API.

## Bank correlation

Корр. ID с tooltip Correlation ID сквозная трассировка Bank API.

## Bank settings webhook

URL webhook для уведомлений о статусе.

## Bank settings commission

Фиксированная комиссия процент.

## Правила обновления

Сверка с terminologiya-ved и istochniki-i-ssylki перед правками. Один primary term на роль. Provider запрет ownerName ФИО паспорт Клиент. RW9 gate обязателен при изменениях copy. Root wording не менять в RW programs.
