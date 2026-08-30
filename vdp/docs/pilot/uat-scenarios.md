# Сценарии UAT

Seed logins из getting-started.md. Стек make compose-up. App contour /login not demo.

## Сценарий User create и submit

Шаг. Login user@vdp.local.

Шаг. Создать заявку через UI create.

Шаг. Убедиться status draft после recognize_complete.

Шаг. Submit accept_form. При неapproved org ожидать organization_waiting_verification.

Ожидание. Заявка видна в Мои заявки. Статус label на языке User copy.

## Сценарий ICO org и form

Шаг. Login ico@vdp.local.

Шаг. Approve org ООО Пример если требуется.

Шаг. ico_form_start и ico_form_accept на заявке User.

Ожидание. Переход к ECO queue Входящие на проверку.

## Сценарий ECO accept

Шаг. Login eco@vdp.local.

Шаг. eco_form_start eco_form_accept.

Ожидание. form_accepted. Manager видит сделку готовую к сопровождению.

## Сценарий Manager contract order payment

Шаг. Login manager@vdp.local.

Шаг. mgr_assign_agent. Contract attach confirm. Order generate attach. User uploads where required.

Шаг. mgr_assign_provider on payment_received. mgr_payment_start after provider assigned.

Ожидание. payment_processing after provider start.

## Сценарий Provider execution

Шаг. Login provider@vdp.local.

Шаг. Реестр без колонки Клиент.

Шаг. prov_payment_start prov_attach_proof prov_payment_sent.

Ожидание. payment_sent. Нет ПДн на карточке.

## Сценарий Close report shipment

Шаг. User upload report. Manager report accept.

Шаг. User shipment upload. Manager mgr_completed or shipment flow.

Ожидание. completed. Dashboard не считает completed active.

## Сценарий Bank channel

Шаг. Login manager or use /testing.

Шаг. smoke bank create with BankOrgID org.

Ожидание. Badge Канал Bank API. Correlation id on card.

## Сценарий Root admin

Шаг. Login root@vdp.local.

Шаг. /admin list accounts block unblock.

Шаг. root_cancel on draft test form.

Ожидание. Admin API 200. Cancel transitions valid.

## Сценарий Reject corrections

Шаг. ECO reject on verification form.

Шаг. User sees corrections. Resubmit.

Ожидание. form_waiting_verification again.

## Пилот vs prod

Пилот допускает stubs for docs mail xlsx. Prod UAT same flows require staging-checklist env filled.
