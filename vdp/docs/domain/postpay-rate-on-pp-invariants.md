# Postpay Rate-On-PP invariants

Правила постоплатного импорта с фиксацией курса в день платёжного поручения провайдера. Источник истины статусной машины — vdp/core/internal/domain/formpayment (machine.go, transitionsImportFormRateOnProviderPostpay). UI — проекция, не владелец статуса.

## Условия входа

Direction равен import. Payment method равен post_payment. Platform postpay mode равен POSTPAY_RATE_ON_PP (rate_on_provider true). При создании импортной постоплаты платформа выставляет этот режим по умолчанию (ApplyImportPostpayDefaults), если mode ещё пуст.

## Путь

Провайдер исполняет валютный перевод до рублёвого покрытия клиента (provider-first). После payment_sent менеджер фиксирует FX rate и режим вознаграждения (fixed, percent или percent_plus_fixed) через RateCommissionPanel. Затем формируется дополнительное поручение (контур ADVANCE_*). Клиент подписывает доп. поручение и платит рубли. Менеджер отмечает получение средств (payment_received). Подтверждение покрытия (treasurer confirm) переводит в report_waiting. Подпись отчёта и accept менеджера закрывают сделку в completed.

## Инварианты

Курс не фиксируется до payment_sent. Это отличает маршрут от авансового §3.1, где rate может быть до первичного поручения.

RateCommissionPanel на карточке заявки монтируется для manager или root только при status payment_sent и EffectiveRateOnProvider.

Дополнительное поручение создаётся после фиксации rate и до рублёвой оплаты клиента.

При отключённом казначее с disable_mode skip менеджер получает CapTreasurerOps (TreasurerOpsRecipient) и может выполнить treas_confirm_payment. На RATE_ON_PP цель перехода — report_waiting, не payment_processing.

## E2E coverage

Browser ladder: vdp/fe/e2e/pilot-matrix-postpay-rate.spec.ts (до advance_signing_order_accepted) и vdp/fe/e2e/pilot-matrix-postpay-full-ladder.spec.ts (до completed с treasurer skip). Тег @pilot-matrix. Gate: make playwright-pilot-matrix или make ci-pr-pilot из каталога vdp.

Compose API dual-config: scripts/compose-e2e.sh IMP2 (treasurer on и skip до report_waiting).
