# Bank API: разрывы vs §5 и `bank.go`

Дата: 2026-09-01. Волна интеграций — **только исследование**. Партнёрский OpenAPI и sandbox банка **не реализованы** и не утверждаются как готовые.

Источники: [вводные/расширение вводных.txt](../вводные/расширение%20вводных.txt) §5; [vdp/core/internal/service/bank.go](../vdp/core/internal/service/bank.go); миграции `011_r10_bank.sql`, `013_bank_org_client_type.sql`; webhook HMAC; UI `BankSettingsPanel` / `ChannelBadge`.

Готовность канала к партнёру: **не готова**. Есть внутренний контур VDP для роли `bank`, нет опубликованного OpenAPI, sandbox и live-badge.

## Сводка есть / нет

| Требование §5 | В VDP сейчас | Разрыв |
|---|---|---|
| Канал заявки не только UI | `channel=bank` на форме, `POST /api/v1/bank/forms` | Нет партнёрского публичного контракта / SDK |
| Организация плательщика в банке | JWT роль `bank`, только своя `organization_id` | Нет отдельного IdP банка; один seed `bank@vdp.local` |
| Идемпотентное create/update | `Idempotency-Key` → `FormIDByBankIdempotency`; replay возвращает ту же форму | Update существующей заявки полями банка **нет** (только create-or-get) |
| Передача суммы, валюты, контрагента, файлов, purpose | `BankCreateInput` + `FileRefs` + `InvoiceJSON.purpose` | Нет инвойс-бинарника как capability URL; нет условий оплаты отдельным полем |
| Ответ: статус, deep-link, correlation id | `BankFormResponse` | Deep-link внутренний `/bank/forms/{id}?correlation_id=` — не кабинет банка |
| AuthN технического клиента | JWT роль `bank` (тот же IdP, что кабинеты) | Нет mTLS, API key, OAuth2 client credentials, отдельного audience |
| Зона видимости — только заявки канала | `GetBankForm` / `ListBankForms` фильтр `channel=bank` + org | Confused deputy: широкий JWT с ролью bank на чужой org режется org check; нет per-partner scope |
| События наружу (webhook **или** poll) | Outbox `TypeBankWebhook` + HMAC-SHA256; GET list/get формы | Poll есть как GET форм, **не** как event cursor. Нет retry/backoff политики webhook на стороне партнёра. Нет live badge |
| Тип клиента «Банк», комиссия, наценка | `SetBankSettings`, `BankFixedCommissionPercent`, `ApplyPlatformMarkup` | Редактируемость курса менеджером для bank — частично (`BankRateReadonly` на аккаунте) |
| Автопропуски §5.4 | `applyBankAutoskip`: org active + default agent + accepted contract → `form_accepted`, иначе verification | Нет автопроверки ТН ВЭД, нет автогенерации поручения, нет ветки «прошлая заявка с контрактом» отдельно от текущего контракта |
| UI менеджера: источник канала | `ChannelBadge` bank/ui | Нет урезанного клиентского UI «шаги в банке» |
| OpenAPI / sandbox / live | Нет | Публичный контракт, стенд партнёра, индикатор live — отсутствуют |
| Webhook HTTPS staging | `BANK_WEBHOOK_URL` в smoke, HMAC в payload | Секрет в outbox payload (нужен vault); нет mTLS |

## AuthN варианты (следующая волна, не эта)

- **Must later:** отдельная machine identity (OAuth2 client credentials **или** API key + IP allowlist), не пользовательский JWT кабинета.
- **Should:** HMAC уже есть на webhook; для inbound — подпись тела + timestamp (replay window).
- **Later:** mTLS между банком и edge; отдельный audience JWT.

Сейчас: тот же JWT secret, роль в токене. Компрометация кабинета ≠ компрометация банка только за счёт роли; **confused deputy** возможен, если сервис с широкими правами вызовет `CreateOrGetBankForm` от имени bank без проверки исходного principal (сейчас principal берётся из JWT на том же endpoint — риск ниже, чем у helper-сервиса).

## Идемпотентность и деньги

- Create: ключ `account_id + Idempotency-Key` → одна форма. Повтор HTTP = та же запись, не второй платёж.
- Денежный commit (execute/confirm) **не** в bank API. Bank create не исполняет платёж.
- Webhook: at-least-once outbox; получатель банка должен быть идемпотентен по `form_payment_id` + `status` + `at`. Это **не проверено** контрактным тестом партнёра.

## Must / should / later

**Must (следующая волна ~8–12 todos эталона, ×1.5 вендор ≈ 12–18 todos):**

1. Опубликовать OpenAPI v1 только bank-контура (create, get, list; без ПДн клиента в примерах).
2. Machine AuthN (API key или OAuth2 CC) + scope org.
3. Документировать HMAC webhook + retry/idempotency для банка.
4. Запрет путать bank JWT с user JWT в BFF (отдельный audience).

**Should (~6 todos):**

5. Poll: `GET /api/v1/bank/forms?since=` или event log, не только полный list.
6. Update заявки по тому же idempotency key (черновик).
7. Staging sandbox runbook без прод-секретов; live badge **false** пока нет партнёра.

**Later:**

8. mTLS; партнёрский sandbox «КОНОПУС»; автопоручение §5.4; урезанный User UI; OpenAPI codegen SDK.

Оценка следующей волны (эталон 3.8 todo/ч): **~14 todos ≈ 3.5 ч** без стенда партнёра; со стендом **×1.5–2 ≈ 5–7 ч**. Не входит: юридический шаблон, prod webhook банка.

## Честно не готово

- Нет партнёрского OpenAPI.
- Нет sandbox и live badge.
- AuthN не machine-to-machine.
- Автоматизации §5.4 (ТН ВЭД, поручение) не закрыты.
- Не утверждать готовность банка к партнёру.
