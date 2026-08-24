# Отчет об API endpoints

**Дата генерации:** 16.01.2026, 01:17:35

## 📊 Статистика

- **Всего контроллеров:** 79
- **Всего endpoints:** 356

### По HTTP методам:

- **GET**: 145
- **PUT**: 88
- **POST**: 54
- **PATCH**: 45
- **DELETE**: 20
- **OPTIONS**: 3

### По модулям:

- **form-payment**: 140
- **organization**: 31
- **account**: 21
- **contract**: 20
- **comment**: 18
- **counterparty**: 15
- **file**: 15
- **compliance-history**: 12
- **auth**: 11
- **treasurer-task**: 11
- **hs-code**: 10
- **agent**: 8
- **currency**: 8
- **liquidity**: 8
- **payment**: 8
- **diadoc**: 6
- **template**: 6
- **socket**: 4
- **configuration**: 2
- **virtual-account**: 1
- **code**: 0
- **mail**: 0
- **recognition**: 0
- **telegram**: 0
- **token**: 0

## 🔍 Swagger

✅ **Swagger доступен**

### Основной API
- **URL:** [http://localhost:30000/api/1.0/fea360/swagger](http://localhost:30000/api/1.0/fea360/swagger)
- **Endpoints:** 306
- **Версия:** 1.0

### API для 1C
- **URL:** [http://localhost:30000/api/1.0/fea360/1c/swagger](http://localhost:30000/api/1.0/fea360/1c/swagger)
- **Endpoints:** 9
- **Версия:** 1.0


## 📋 Endpoints по модулям

### account (21 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/account` | AccountAdminController | `modules/account/web/admin/account-admin.controller.ts` |
| `GET` | `admin/account/count` | AccountAdminController | `modules/account/web/admin/account-admin.controller.ts` |
| `GET` | `admin/account/:_id` | AccountAdminController | `modules/account/web/admin/account-admin.controller.ts` |
| `GET` | `admin/account/:_id/rate-settings` | AccountRateSettingsController | `modules/account/web/admin-rate-settings/account-rate-settings.controller.ts` |
| `GET` | `admin/account/:_id/rate-history` | AccountRateSettingsController | `modules/account/web/admin-rate-settings/account-rate-settings.controller.ts` |
| `GET` | `admin/account/:_id/rate-history/manager` | AccountRateSettingsController | `modules/account/web/admin-rate-settings/account-rate-settings.controller.ts` |
| `GET` | `compliance-officer/account/:_id` | AccountComplianceOfficerController | `modules/account/web/compliance-officer/account-compliance-officer.controller.ts` |
| `GET` | `provider/account/:_id` | AccountProviderController | `modules/account/web/provider/account-provider.controller.ts` |
| `GET` | `account` | AccountSiteController | `modules/account/web/site/account-site.controller.ts` |
| `GET` | `account/full` | AccountSiteController | `modules/account/web/site/account-site.controller.ts` |
| `GET` | `treasurer/account/:_id` | AccountTreasurerController | `modules/account/web/treasurer/account-treasurer.controller.ts` |
| `POST` | `admin/account` | AccountAdminController | `modules/account/web/admin/account-admin.controller.ts` |
| `PUT` | `admin/account/:_id/rate-settings` | AccountRateSettingsController | `modules/account/web/admin-rate-settings/account-rate-settings.controller.ts` |
| `PUT` | `admin/account/:_id/rate-settings/bulk` | AccountRateSettingsController | `modules/account/web/admin-rate-settings/account-rate-settings.controller.ts` |
| `PATCH` | `admin/account/:_id` | AccountAdminController | `modules/account/web/admin/account-admin.controller.ts` |
| `PATCH` | `compliance-officer/account` | AccountComplianceOfficerController | `modules/account/web/compliance-officer/account-compliance-officer.controller.ts` |
| `PATCH` | `manager/account` | AccountManagerController | `modules/account/web/manager/account-manager.controller.ts` |
| `PATCH` | `provider/account` | AccountProviderController | `modules/account/web/provider/account-provider.controller.ts` |
| `PATCH` | `account` | AccountSiteController | `modules/account/web/site/account-site.controller.ts` |
| `DELETE` | `admin/account/:_id` | AccountAdminController | `modules/account/web/admin/account-admin.controller.ts` |
| `DELETE` | `admin/account/:_id/rate-settings` | AccountRateSettingsController | `modules/account/web/admin-rate-settings/account-rate-settings.controller.ts` |

### agent (8 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/agent` | AgentAdminController | `modules/agent/web/admin/agent-admin.controller.ts` |
| `GET` | `admin/agent/count` | AgentAdminController | `modules/agent/web/admin/agent-admin.controller.ts` |
| `GET` | `admin/agent/:_id` | AgentAdminController | `modules/agent/web/admin/agent-admin.controller.ts` |
| `GET` | `1c/agent` | AgentOneCController | `modules/agent/web/one-c/agent-one-c.controller.ts` |
| `GET` | `treasurer/agent/:_id` | AgentTreasurerController | `modules/agent/web/treasurer/agent-treasurer.controller.ts` |
| `POST` | `admin/agent` | AgentAdminController | `modules/agent/web/admin/agent-admin.controller.ts` |
| `PATCH` | `admin/agent/:_id` | AgentAdminController | `modules/agent/web/admin/agent-admin.controller.ts` |
| `PATCH` | `admin/agent/:_id/files` | AgentAdminController | `modules/agent/web/admin/agent-admin.controller.ts` |

### auth (11 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `POST` | `1c/auth/login` | AuthOneCController | `modules/auth/web/one-c/auth-one-c.controller.ts` |
| `POST` | `1c/auth/refresh-token` | AuthOneCController | `modules/auth/web/one-c/auth-one-c.controller.ts` |
| `POST` | `auth/registration` | AuthSiteController | `modules/auth/web/site/auth-site.controller.ts` |
| `POST` | `auth/registration/re-send` | AuthSiteController | `modules/auth/web/site/auth-site.controller.ts` |
| `POST` | `auth/registration/confirm` | AuthSiteController | `modules/auth/web/site/auth-site.controller.ts` |
| `POST` | `auth/login` | AuthSiteController | `modules/auth/web/site/auth-site.controller.ts` |
| `POST` | `auth/restore` | AuthSiteController | `modules/auth/web/site/auth-site.controller.ts` |
| `POST` | `auth/confirm/restore` | AuthSiteController | `modules/auth/web/site/auth-site.controller.ts` |
| `POST` | `auth/login-external` | AuthSiteController | `modules/auth/web/site/auth-site.controller.ts` |
| `POST` | `auth/logout` | AuthSiteController | `modules/auth/web/site/auth-site.controller.ts` |
| `POST` | `auth/refresh-token` | AuthSiteController | `modules/auth/web/site/auth-site.controller.ts` |

### comment (18 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `manager/comment` | CommentManagerController | `modules/comment/web/manager/comment-manager.controller.ts` |
| `GET` | `manager/comment/entities-with-unread-comments` | CommentManagerController | `modules/comment/web/manager/comment-manager.controller.ts` |
| `GET` | `provider/comment` | CommentProviderController | `modules/comment/web/provider/comment-provider.controller.ts` |
| `GET` | `provider/comment/entities-with-unread-comments` | CommentProviderController | `modules/comment/web/provider/comment-provider.controller.ts` |
| `GET` | `comment` | CommentSiteController | `modules/comment/web/site/comment-site.controller.ts` |
| `GET` | `comment/unread` | CommentSiteController | `modules/comment/web/site/comment-site.controller.ts` |
| `GET` | `comment/entities-with-unread-comments` | CommentSiteController | `modules/comment/web/site/comment-site.controller.ts` |
| `POST` | `manager/comment` | CommentManagerController | `modules/comment/web/manager/comment-manager.controller.ts` |
| `POST` | `provider/comment` | CommentProviderController | `modules/comment/web/provider/comment-provider.controller.ts` |
| `POST` | `comment` | CommentSiteController | `modules/comment/web/site/comment-site.controller.ts` |
| `PUT` | `manager/comment/mark-as-read` | CommentManagerController | `modules/comment/web/manager/comment-manager.controller.ts` |
| `PUT` | `provider/comment/mark-as-read` | CommentProviderController | `modules/comment/web/provider/comment-provider.controller.ts` |
| `PUT` | `comment/mark-as-read` | CommentSiteController | `modules/comment/web/site/comment-site.controller.ts` |
| `PATCH` | `manager/comment/:_id` | CommentManagerController | `modules/comment/web/manager/comment-manager.controller.ts` |
| `PATCH` | `provider/comment/:_id` | CommentProviderController | `modules/comment/web/provider/comment-provider.controller.ts` |
| `PATCH` | `comment/:_id` | CommentSiteController | `modules/comment/web/site/comment-site.controller.ts` |
| `DELETE` | `manager/comment/:_id` | CommentManagerController | `modules/comment/web/manager/comment-manager.controller.ts` |
| `DELETE` | `provider/comment/:_id` | CommentProviderController | `modules/comment/web/provider/comment-provider.controller.ts` |

### compliance-history (12 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/compliance-officer/clients` | ComplianceHistoryCOController | `modules/compliance-history/web/compliance-officer/compliance-history-co.controller.ts` |
| `GET` | `admin/compliance-officer/clients/xlsx` | ComplianceHistoryCOController | `modules/compliance-history/web/compliance-officer/compliance-history-co.controller.ts` |
| `GET` | `admin/compliance-officer/clients/:_id` | ComplianceHistoryCOController | `modules/compliance-history/web/compliance-officer/compliance-history-co.controller.ts` |
| `GET` | `admin/compliance-officer/clients/:_id/requests` | ComplianceHistoryCOController | `modules/compliance-history/web/compliance-officer/compliance-history-co.controller.ts` |
| `GET` | `admin/compliance-officer/clients/:_id/requests/xlsx` | ComplianceHistoryCOController | `modules/compliance-history/web/compliance-officer/compliance-history-co.controller.ts` |
| `GET` | `admin/compliance-officer/clients/:_id/organization-card` | ComplianceHistoryCOController | `modules/compliance-history/web/compliance-officer/compliance-history-co.controller.ts` |
| `GET` | `admin/internal-compliance-officer/clients` | ComplianceHistoryICOController | `modules/compliance-history/web/internal-compliance-officer/compliance-history-ico.controller.ts` |
| `GET` | `admin/internal-compliance-officer/clients/xlsx` | ComplianceHistoryICOController | `modules/compliance-history/web/internal-compliance-officer/compliance-history-ico.controller.ts` |
| `GET` | `admin/internal-compliance-officer/clients/:_id` | ComplianceHistoryICOController | `modules/compliance-history/web/internal-compliance-officer/compliance-history-ico.controller.ts` |
| `GET` | `admin/internal-compliance-officer/clients/:_id/requests` | ComplianceHistoryICOController | `modules/compliance-history/web/internal-compliance-officer/compliance-history-ico.controller.ts` |
| `GET` | `admin/internal-compliance-officer/clients/:_id/requests/xlsx` | ComplianceHistoryICOController | `modules/compliance-history/web/internal-compliance-officer/compliance-history-ico.controller.ts` |
| `GET` | `admin/internal-compliance-officer/clients/:_id/organization-card` | ComplianceHistoryICOController | `modules/compliance-history/web/internal-compliance-officer/compliance-history-ico.controller.ts` |

### configuration (2 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/configuration` | ConfigurationAdminController | `modules/configuration/web/admin/configuration-admin.controller.ts` |
| `PATCH` | `admin/configuration` | ConfigurationAdminController | `modules/configuration/web/admin/configuration-admin.controller.ts` |

### contract (20 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/contract` | ContractAdminController | `modules/contract/web/admin/contract-admin.controller.ts` |
| `GET` | `admin/contract/full` | ContractAdminController | `modules/contract/web/admin/contract-admin.controller.ts` |
| `GET` | `admin/contract/count` | ContractAdminController | `modules/contract/web/admin/contract-admin.controller.ts` |
| `GET` | `admin/contract/:_id` | ContractAdminController | `modules/contract/web/admin/contract-admin.controller.ts` |
| `GET` | `contract` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `GET` | `contract/full/:organization` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `GET` | `contract/count` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `GET` | `contract/one` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `GET` | `contract/one/template` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `GET` | `contract/:_id` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `GET` | `contract/:_id/diadoc-status` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `GET` | `full` | ContractTreasurerController | `modules/contract/web/treasurer/contract-treasurer.controller.ts` |
| `POST` | `admin/contract/template` | ContractAdminController | `modules/contract/web/admin/contract-admin.controller.ts` |
| `POST` | `admin/contract` | ContractAdminController | `modules/contract/web/admin/contract-admin.controller.ts` |
| `POST` | `contract` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `POST` | `contract/:_id/sign-via-diadoc` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `PUT` | `admin/contract/:_id/accept` | ContractAdminController | `modules/contract/web/admin/contract-admin.controller.ts` |
| `PUT` | `admin/contract/:_id/reject` | ContractAdminController | `modules/contract/web/admin/contract-admin.controller.ts` |
| `PUT` | `contract/:_id` | ContractSiteController | `modules/contract/web/site/contract-site.controller.ts` |
| `PATCH` | `admin/contract/:_id` | ContractAdminController | `modules/contract/web/admin/contract-admin.controller.ts` |

### counterparty (15 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `counterparty/list` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `GET` | `counterparty/:id` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `GET` | `counterparty/:id/approval-indicator` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `GET` | `counterparty/:id/can-skip-compliance` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `GET` | `counterparty/:id/requests` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `GET` | `counterparty/:id/requests/xlsx` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `POST` | `counterparty/create` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `POST` | `counterparty/find-or-create` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `POST` | `counterparty/:id/form-payment` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `PATCH` | `counterparty/:id` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `PATCH` | `counterparty/:id/bank/:bankUuid/account` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `PATCH` | `counterparty/:id/bank/:bankUuid/account/:accountUuid` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `DELETE` | `counterparty/:id` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `DELETE` | `counterparty/:id/bank/:bankUuid/account/:accountUuid` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |
| `DELETE` | `counterparty/:id/form-payment/:formPaymentId` | CounterpartyController | `modules/counterparty/web/counterparty.controller.ts` |

### currency (8 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/currency` | CurrencyAdminController | `modules/currency/web/admin/currency-admin.controller.ts` |
| `GET` | `admin/currency/count` | CurrencyAdminController | `modules/currency/web/admin/currency-admin.controller.ts` |
| `GET` | `admin/currency/rate` | CurrencyAdminController | `modules/currency/web/admin/currency-admin.controller.ts` |
| `GET` | `currency` | CurrencySiteController | `modules/currency/web/site/currency-site.controller.ts` |
| `GET` | `currency/dashboard-rate` | CurrencySiteController | `modules/currency/web/site/currency-site.controller.ts` |
| `GET` | `currency/count` | CurrencySiteController | `modules/currency/web/site/currency-site.controller.ts` |
| `GET` | `currency/:symbol/:source` | CurrencySiteController | `modules/currency/web/site/currency-site.controller.ts` |
| `PATCH` | `admin/currency/:_id` | CurrencyAdminController | `modules/currency/web/admin/currency-admin.controller.ts` |

### diadoc (7 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `diadoc/health` | DiadocController | `modules/diadoc/web/diadoc.controller.ts` |
| `GET` | `diadoc/metrics` | DiadocController | `modules/diadoc/web/diadoc.controller.ts` |
| `POST` | `diadoc-webhook-example` | DiadocWebhookExampleController | `modules/diadoc/examples/handle-webhook.example.ts` |
| `POST` | `payment-orders/:id/send-to-diadoc` | - | `modules/diadoc/examples/send-payment-order.example.ts` |
| `POST` | `diadoc/webhook` | DiadocController | `modules/diadoc/web/diadoc.controller.ts` |
| `POST` | `diadoc/metrics/reset` | DiadocController | `modules/diadoc/web/diadoc.controller.ts` |
| `POST` | `diadoc/check-status` | DiadocController | `modules/diadoc/web/diadoc.controller.ts` |

### file (15 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/file-store/preview/:_id` | FileAdminController | `modules/file/web/admin/file-admin.controller.ts` |
| `GET` | `1c/file-store/preview/:_id` | FileOneCController | `modules/file/web/one-c/file-one-c.controller.ts` |
| `GET` | `admin/provider/file-store/preview/private/:form/:filePath` | FileProviderController | `modules/file/web/provider/file-provider.controller.ts` |
| `GET` | `file-store/preview/private/:_id` | FileSiteController | `modules/file/web/site/file-site.controller.ts` |
| `GET` | `file-store/preview/private/contract/:contract` | FileSiteController | `modules/file/web/site/file-site.controller.ts` |
| `GET` | `file-store/preview/private/:form/:filePath` | FileSiteController | `modules/file/web/site/file-site.controller.ts` |
| `GET` | `file-store/preview/private/:_id/string` | FileSiteController | `modules/file/web/site/file-site.controller.ts` |
| `GET` | `file-store/preview/:_id` | FileSiteController | `modules/file/web/site/file-site.controller.ts` |
| `GET` | `file-store/static/:type/:name` | FileSiteController | `modules/file/web/site/file-site.controller.ts` |
| `POST` | `admin/file-store/upload` | FileAdminController | `modules/file/web/admin/file-admin.controller.ts` |
| `POST` | `admin/file-store/upload/pdf` | FileAdminController | `modules/file/web/admin/file-admin.controller.ts` |
| `POST` | `admin/provider/file-store/upload` | FileProviderController | `modules/file/web/provider/file-provider.controller.ts` |
| `POST` | `admin/provider/file-store/upload/pdf` | FileProviderController | `modules/file/web/provider/file-provider.controller.ts` |
| `POST` | `file-store/upload` | FileSiteController | `modules/file/web/site/file-site.controller.ts` |
| `POST` | `file-store/upload/pdf` | FileSiteController | `modules/file/web/site/file-site.controller.ts` |

### form-payment (140 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/form-payment` | FormPaymentAdminController | `modules/form-payment/web/admin/form-payment-admin.controller.ts` |
| `GET` | `admin/form-payment/count` | FormPaymentAdminController | `modules/form-payment/web/admin/form-payment-admin.controller.ts` |
| `GET` | `admin/form-payment/xlsx` | FormPaymentAdminController | `modules/form-payment/web/admin/form-payment-admin.controller.ts` |
| `GET` | `admin/form-payment/:_id/xlsx` | FormPaymentAdminController | `modules/form-payment/web/admin/form-payment-admin.controller.ts` |
| `GET` | `admin/form-payment/:_id` | FormPaymentAdminController | `modules/form-payment/web/admin/form-payment-admin.controller.ts` |
| `GET` | `admin/compliance-officer/form-payment` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `GET` | `admin/compliance-officer/form-payment/count` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `GET` | `admin/compliance-officer/form-payment/xlsx` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `GET` | `admin/compliance-officer/form-payment/:_id/xlsx` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `GET` | `admin/compliance-officer/form-payment/:_id` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `GET` | `admin/internal-compliance-officer/form-payment` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `GET` | `admin/internal-compliance-officer/form-payment/count` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `GET` | `admin/internal-compliance-officer/form-payment/xlsx` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `GET` | `admin/internal-compliance-officer/form-payment/:_id/xlsx` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `GET` | `admin/internal-compliance-officer/form-payment/:_id` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `GET` | `admin/manager/form-payment` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `GET` | `admin/manager/form-payment/count` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `GET` | `admin/manager/form-payment/xlsx` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `GET` | `admin/manager/form-payment/:_id/xlsx` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `GET` | `admin/manager/form-payment/:_id` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `GET` | `admin/manager/form-payment/:_id/report/diadoc-status` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `GET` | `1c/form-payment` | FormPaymentOneCController | `modules/form-payment/web/one-c/form-payment-one-c.controller.ts` |
| `GET` | `1c/form-payment/count` | FormPaymentOneCController | `modules/form-payment/web/one-c/form-payment-one-c.controller.ts` |
| `GET` | `admin/provider/form-payment` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `GET` | `admin/provider/form-payment/count` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `GET` | `admin/provider/form-payment/xlsx` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `GET` | `admin/provider/form-payment/:_id/xlsx` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `GET` | `admin/provider/form-payment/:_id` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `GET` | `form-payment` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `form-payment/count` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `form-payment/export/payment-received` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `form-payment/by-order-accepted` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `form-payment/by-order-accepted/count` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `form-payment/:_id` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `form-payment/:_id/payment-order/diadoc-status` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `form-payment/:_id/hs-codes` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `form-payment/:_id/suggested-providers` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `form-payment/:_id/sign-method` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `GET` | `admin/treasurer/form-payment` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |
| `GET` | `admin/treasurer/form-payment/:_id` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |
| `POST` | `admin/compliance-officer/form-payment/:_id/analyze-counterparty` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `POST` | `admin/manager/form-payment/:_id/report/sign-via-diadoc` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `POST` | `admin/manager/form-payment/:_id/generate-agent-report` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `POST` | `admin/provider/form-payment` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `POST` | `form-payment` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `POST` | `form-payment/:_id/payment-order/sign-via-diadoc` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `POST` | `form-payment/:_id/copy` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `POST` | `form-payment/import` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `POST` | `form-payment/:_id/invoices` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `POST` | `admin/treasurer/form-payment/:_id/treasurer-order/upload` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |
| `PUT` | `admin/compliance-officer/form-payment/:_id/cancel` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `PUT` | `admin/compliance-officer/form-payment/:_id/form/start` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `PUT` | `admin/compliance-officer/form-payment/:_id/form/stop` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `PUT` | `admin/compliance-officer/form-payment/:_id/form/accept` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `PUT` | `admin/compliance-officer/form-payment/:_id/form/reject` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/form/start` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/form/stop` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/form/accept` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/form/reject` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/cancel` | FormPaymentInternalComplianceOfficerController | `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/completed` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/form/reject` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/form/start` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/form/stop` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/form/accept` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/cancel` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/make-important` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/make-unimportant` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order/start` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order/stop` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order/accept` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order/reject` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order/signing` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order/generate` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/start` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/stop` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/accept` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/reject` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/revoke` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/signing` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/payment/received` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/payment/stop` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/payment/start` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/payment/return-to-sent` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/payment/sent` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/payment/cancel` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/shipment/start` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/shipment/stop` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/shipment/accept` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/shipment/reject` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/report/start` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/report/stop` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/report/accept` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/report/reject` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/report/revoke` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/report/signing` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/report` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/refund/init` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/refund/cancel` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/refund/start` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/refund/stop` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/manager/form-payment/:_id/refund/sent` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PUT` | `admin/provider/form-payment/:_id/payment/received` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `PUT` | `admin/provider/form-payment/:_id/payment/start` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `PUT` | `admin/provider/form-payment/:_id/payment/stop` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `PUT` | `admin/provider/form-payment/:_id/payment/sent` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `PUT` | `admin/provider/form-payment/:_id/payment/cancel` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `PUT` | `admin/provider/form-payment/:_id/make-important` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `PUT` | `admin/provider/form-payment/:_id/make-unimportant` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `PUT` | `admin/provider/form-payment/:_id/form/manager` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `PUT` | `form-payment/:_id/cancel` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/payments` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/form/accept` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/form/accept-corrections` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/order` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/order-advance` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/report` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/shipment` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/shipment/accept` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/additional` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `form-payment/:_id/signing-order-verification-treasurer` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PUT` | `admin/treasurer/form-payment/:_id/signing-order-treasurer` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |
| `PUT` | `admin/treasurer/form-payment/:_id/return-to-payment-sent-treasurer` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |
| `PUT` | `admin/treasurer/form-payment/:_id/order-waiting-correction-treasurer` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |
| `PUT` | `admin/treasurer/form-payment/:_id/complete-from-verification-treasurer` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |
| `PUT` | `admin/treasurer/form-payment/:_id/return-to-signing-order-treasurer` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |
| `PATCH` | `admin/form-payment/:_id` | FormPaymentAdminController | `modules/form-payment/web/admin/form-payment-admin.controller.ts` |
| `PATCH` | `admin/compliance-officer/form-payment/:_id` | FormPaymentComplianceOfficerController | `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts` |
| `PATCH` | `admin/manager/form-payment/:_id` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PATCH` | `admin/manager/form-payment/:_id/rate` | FormPaymentManagerController | `modules/form-payment/web/manager/form-payment-manager.controller.ts` |
| `PATCH` | `admin/provider/form-payment/:_id` | FormPaymentProviderController | `modules/form-payment/web/provider/form-payment-provider.controller.ts` |
| `PATCH` | `form-payment/:_id/rate` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PATCH` | `form-payment/:_id/form` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PATCH` | `form-payment/:_id/invoice/:uuid/hs-codes` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PATCH` | `form-payment/:_id/invoices/:uuid` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PATCH` | `form-payment/:_id/sign-method` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `PATCH` | `admin/treasurer/form-payment/:_id/confirm-payment` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |
| `DELETE` | `form-payment/:formPaymentId/files/:fileId` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `DELETE` | `form-payment/:_id/invoices/:uuid` | FormPaymentSiteController | `modules/form-payment/web/site/form-payment-site.controller.ts` |
| `DELETE` | `admin/treasurer/form-payment/:_id/treasurer-order` | FormPaymentTreasurerController | `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts` |

### hs-code (10 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `hs-code` | HsCodeSiteController | `modules/hs-code/web/site/hs-code-site.controller.ts` |
| `GET` | `hs-code/count` | HsCodeSiteController | `modules/hs-code/web/site/hs-code-site.controller.ts` |
| `GET` | `hs-code/:code` | HsCodeSiteController | `modules/hs-code/web/site/hs-code-site.controller.ts` |
| `POST` | `admin/compliance-officer/hs-code` | HsCodeComplianceOfficerController | `modules/hs-code/web/compliance-officer/hs-code-compliance-officer.controller.ts` |
| `POST` | `admin/root/hs-code/import` | HsCodeRootController | `modules/hs-code/web/root/hs-code-root.controller.ts` |
| `PATCH` | `admin/compliance-officer/hs-code/:id` | HsCodeComplianceOfficerController | `modules/hs-code/web/compliance-officer/hs-code-compliance-officer.controller.ts` |
| `PATCH` | `admin/compliance-officer/hs-code/:id/deactivate` | HsCodeComplianceOfficerController | `modules/hs-code/web/compliance-officer/hs-code-compliance-officer.controller.ts` |
| `PATCH` | `admin/compliance-officer/hs-code/:id/activate` | HsCodeComplianceOfficerController | `modules/hs-code/web/compliance-officer/hs-code-compliance-officer.controller.ts` |
| `DELETE` | `admin/compliance-officer/hs-code/:id` | HsCodeComplianceOfficerController | `modules/hs-code/web/compliance-officer/hs-code-compliance-officer.controller.ts` |
| `DELETE` | `admin/root/hs-code/:id` | HsCodeRootController | `modules/hs-code/web/root/hs-code-root.controller.ts` |

### liquidity (8 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/liquidity/findOne` | LiquidityAdminController | `modules/liquidity/web/admin/liquidity-admin.controller.ts` |
| `GET` | `admin/compliance-officer/liquidity/findOne` | LiquidityComplianceOfficerController | `modules/liquidity/web/compliance-officer/liquidity-compliance-officer.controller.ts` |
| `GET` | `admin/internal-compliance-officer/liquidity/findOne` | LiquidityInternalComplianceOfficerController | `modules/liquidity/web/internal-compliance-officer/liquidity-internal-compliance-officer.controller.ts` |
| `GET` | `admin/manager/liquidity/findOne` | LiquidityManagerController | `modules/liquidity/web/manager/liquidity-manager.controller.ts` |
| `GET` | `admin/provider/liquidity/findOne` | LiquidityProviderController | `modules/liquidity/web/provider/liquidity-provider.controller.ts` |
| `GET` | `liquidity` | LiquiditySiteController | `modules/liquidity/web/site/liquidity-site.controller.ts` |
| `POST` | `admin/liquidity/convert` | LiquidityAdminController | `modules/liquidity/web/admin/liquidity-admin.controller.ts` |
| `PATCH` | `admin/liquidity/:_id` | LiquidityAdminController | `modules/liquidity/web/admin/liquidity-admin.controller.ts` |

### organization (31 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/internal-compliance-officer/organization` | OrganizationInternalComplianceOfficerController | `modules/organization/web/internal-compliance-officer/organization-internal-compliance-officer.controller.ts` |
| `GET` | `admin/internal-compliance-officer/organization/count` | OrganizationInternalComplianceOfficerController | `modules/organization/web/internal-compliance-officer/organization-internal-compliance-officer.controller.ts` |
| `GET` | `admin/internal-compliance-officer/organization/:_id` | OrganizationInternalComplianceOfficerController | `modules/organization/web/internal-compliance-officer/organization-internal-compliance-officer.controller.ts` |
| `GET` | `admin/manager/organization` | OrganizationManagerController | `modules/organization/web/manager/organization-manager.controller.ts` |
| `GET` | `admin/manager/organization/:_id` | OrganizationManagerController | `modules/organization/web/manager/organization-manager.controller.ts` |
| `GET` | `admin/manager/organization/count` | OrganizationManagerController | `modules/organization/web/manager/organization-manager.controller.ts` |
| `GET` | `admin/provider/organization` | OrganizationProviderController | `modules/organization/web/provider/organization-provider.controller.ts` |
| `GET` | `admin/provider/organization/count` | OrganizationProviderController | `modules/organization/web/provider/organization-provider.controller.ts` |
| `GET` | `admin/provider/organization/:_id` | OrganizationProviderController | `modules/organization/web/provider/organization-provider.controller.ts` |
| `GET` | `organization` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `GET` | `organization/invited` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `GET` | `organization/count` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `GET` | `organization/fetch-by-inn` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `GET` | `organization/:_id` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `POST` | `admin/manager/organization` | OrganizationManagerController | `modules/organization/web/manager/organization-manager.controller.ts` |
| `POST` | `admin/provider/organization` | OrganizationProviderController | `modules/organization/web/provider/organization-provider.controller.ts` |
| `POST` | `organization` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `PUT` | `admin/internal-compliance-officer/organization/:_id/approve` | OrganizationInternalComplianceOfficerController | `modules/organization/web/internal-compliance-officer/organization-internal-compliance-officer.controller.ts` |
| `PUT` | `admin/internal-compliance-officer/organization/:_id/un-approve` | OrganizationInternalComplianceOfficerController | `modules/organization/web/internal-compliance-officer/organization-internal-compliance-officer.controller.ts` |
| `PUT` | `admin/internal-compliance-officer/organization/:_id/block` | OrganizationInternalComplianceOfficerController | `modules/organization/web/internal-compliance-officer/organization-internal-compliance-officer.controller.ts` |
| `PUT` | `organization/:_id/delegate/:delegateToSubaccount` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `PATCH` | `admin/manager/organization/:_id` | OrganizationManagerController | `modules/organization/web/manager/organization-manager.controller.ts` |
| `PATCH` | `admin/provider/organization/:_id` | OrganizationProviderController | `modules/organization/web/provider/organization-provider.controller.ts` |
| `PATCH` | `organization/:_id/invite-subaccount` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `PATCH` | `organization/:_id/delete-subaccount` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `PATCH` | `organization/:_id/accept-invite` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `PATCH` | `organization/:_id/reject-invite` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `PATCH` | `organization/:_id` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |
| `DELETE` | `admin/manager/organization/:_id` | OrganizationManagerController | `modules/organization/web/manager/organization-manager.controller.ts` |
| `DELETE` | `admin/provider/organization/:_id` | OrganizationProviderController | `modules/organization/web/provider/organization-provider.controller.ts` |
| `DELETE` | `organization/:_id` | OrganizationSiteController | `modules/organization/web/site/organization-site.controller.ts` |

### payment (8 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/payment` | PaymentAdminController | `modules/payment/web/admin/payment-admin.controller.ts` |
| `GET` | `admin/manager/payment` | PaymentManagerController | `modules/payment/web/manager/payment-manager.controller.ts` |
| `GET` | `admin/manager/payment/by-form-payment/:_id` | PaymentManagerController | `modules/payment/web/manager/payment-manager.controller.ts` |
| `GET` | `1c/payment` | PaymentOneCController | `modules/payment/web/one-c/payment-one-c.controller.ts` |
| `GET` | `1c/payment/count` | PaymentOneCController | `modules/payment/web/one-c/payment-one-c.controller.ts` |
| `POST` | `1c/payment` | PaymentOneCController | `modules/payment/web/one-c/payment-one-c.controller.ts` |
| `POST` | `1c/payment/many` | PaymentOneCController | `modules/payment/web/one-c/payment-one-c.controller.ts` |
| `DELETE` | `admin/payment` | PaymentAdminController | `modules/payment/web/admin/payment-admin.controller.ts` |

### socket (4 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `POST` | `socket/negotiate-connection` | SocketSiteController | `modules/socket/web/site/socket-site.controller.ts` |
| `OPTIONS` | `socket/message` | SocketSiteController | `modules/socket/web/site/socket-site.controller.ts` |
| `OPTIONS` | `socket/message` | SocketSiteController | `modules/socket/web/site/socket-site.controller.ts` |
| `OPTIONS` | `socket/message.created` | SocketSiteController | `modules/socket/web/site/socket-site.controller.ts` |

### template (6 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/templates` | TemplateAdminController | `modules/template/web/admin/template-admin.controller.ts` |
| `GET` | `admin/templates/:id` | TemplateAdminController | `modules/template/web/admin/template-admin.controller.ts` |
| `GET` | `templates` | TemplateSiteController | `modules/template/web/site/template-site.controller.ts` |
| `POST` | `admin/templates` | TemplateAdminController | `modules/template/web/admin/template-admin.controller.ts` |
| `PATCH` | `admin/templates/:id` | TemplateAdminController | `modules/template/web/admin/template-admin.controller.ts` |
| `DELETE` | `admin/templates/:id` | TemplateAdminController | `modules/template/web/admin/template-admin.controller.ts` |

### treasurer-task (11 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `admin/treasurer/task` | TreasurerTaskTreasurerController | `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts` |
| `POST` | `admin/treasurer/task/:_id/generate-payment-order` | TreasurerTaskTreasurerController | `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts` |
| `PATCH` | `treasurer-task/:formPaymentId/order-signed` | TreasurerTaskSiteController | `modules/treasurer-task/web/site/treasurer-task-site.controller.ts` |
| `PATCH` | `admin/treasurer/task/:_id/status` | TreasurerTaskTreasurerController | `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts` |
| `PATCH` | `admin/treasurer/task/:_id/exchange-rate` | TreasurerTaskTreasurerController | `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts` |
| `PATCH` | `admin/treasurer/task/:_id/commission` | TreasurerTaskTreasurerController | `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts` |
| `PATCH` | `admin/treasurer/task/:_id/order` | TreasurerTaskTreasurerController | `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts` |
| `PATCH` | `admin/treasurer/task/:_id/export-revenue-confirmation` | TreasurerTaskTreasurerController | `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts` |
| `DELETE` | `treasurer-task/:formPaymentId/order-signed` | TreasurerTaskSiteController | `modules/treasurer-task/web/site/treasurer-task-site.controller.ts` |
| `DELETE` | `admin/treasurer/task/:_id/order` | TreasurerTaskTreasurerController | `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts` |
| `DELETE` | `admin/treasurer/task/:_id/export-revenue-confirmation` | TreasurerTaskTreasurerController | `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts` |

### virtual-account (1 endpoints)

| Метод | Путь | Контроллер | Файл |
|-------|------|------------|------|
| `GET` | `virtual-account` | VirtualAccountSiteController | `modules/virtual-account/web/site/virtual-account-site.controller.ts` |


## 🎯 Контроллеры

### AccountAdminController

- **Файл:** `modules/account/web/admin/account-admin.controller.ts`
- **Модуль:** account
- **Базовый путь:** `admin/account`
- **ApiTags:** `admin account`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/account` | - |
| `GET` | `admin/account/count` | - |
| `GET` | `admin/account/:_id` | - |
| `POST` | `admin/account` | - |
| `PATCH` | `admin/account/:_id` | - |
| `DELETE` | `admin/account/:_id` | - |

### AccountComplianceOfficerController

- **Файл:** `modules/account/web/compliance-officer/account-compliance-officer.controller.ts`
- **Модуль:** account
- **Базовый путь:** `compliance-officer/account`
- **ApiTags:** `compliance officer account`
- **Endpoints:** 2

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `compliance-officer/account/:_id` | - |
| `PATCH` | `compliance-officer/account` | - |

### AccountManagerController

- **Файл:** `modules/account/web/manager/account-manager.controller.ts`
- **Модуль:** account
- **Базовый путь:** `manager/account`
- **ApiTags:** `manager account`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `PATCH` | `manager/account` | - |

### AccountProviderController

- **Файл:** `modules/account/web/provider/account-provider.controller.ts`
- **Модуль:** account
- **Базовый путь:** `provider/account`
- **ApiTags:** `provider account`
- **Endpoints:** 2

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `provider/account/:_id` | - |
| `PATCH` | `provider/account` | - |

### AccountRateSettingsController

- **Файл:** `modules/account/web/admin-rate-settings/account-rate-settings.controller.ts`
- **Модуль:** account
- **Базовый путь:** `admin/account`
- **ApiTags:** `admin rate settings`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/account/:_id/rate-settings` | - |
| `GET` | `admin/account/:_id/rate-history` | - |
| `GET` | `admin/account/:_id/rate-history/manager` | - |
| `PUT` | `admin/account/:_id/rate-settings` | - |
| `PUT` | `admin/account/:_id/rate-settings/bulk` | - |
| `DELETE` | `admin/account/:_id/rate-settings` | - |

### AccountRPCController

- **Файл:** `modules/account/rpc/account-rpc.controller.ts`
- **Модуль:** account
- **Endpoints:** 0

### AccountSiteController

- **Файл:** `modules/account/web/site/account-site.controller.ts`
- **Модуль:** account
- **Базовый путь:** `account`
- **ApiTags:** `account`
- **Endpoints:** 3

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `account` | - |
| `GET` | `account/full` | - |
| `PATCH` | `account` | - |

### AccountTreasurerController

- **Файл:** `modules/account/web/treasurer/account-treasurer.controller.ts`
- **Модуль:** account
- **Базовый путь:** `treasurer/account`
- **ApiTags:** `treasurer account`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `treasurer/account/:_id` | - |

### AgentAdminController

- **Файл:** `modules/agent/web/admin/agent-admin.controller.ts`
- **Модуль:** agent
- **Базовый путь:** `admin/agent`
- **ApiTags:** `admin agent`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/agent` | - |
| `GET` | `admin/agent/count` | - |
| `GET` | `admin/agent/:_id` | - |
| `POST` | `admin/agent` | - |
| `PATCH` | `admin/agent/:_id` | - |
| `PATCH` | `admin/agent/:_id/files` | Update agent data |

### AgentOneCController

- **Файл:** `modules/agent/web/one-c/agent-one-c.controller.ts`
- **Модуль:** agent
- **Базовый путь:** `1c/agent`
- **ApiTags:** `one c agent`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `1c/agent` | - |

### AgentRpcController

- **Файл:** `modules/agent/rpc/agent-rpc.controller.ts`
- **Модуль:** agent
- **Endpoints:** 0

### AgentTreasurerController

- **Файл:** `modules/agent/web/treasurer/agent-treasurer.controller.ts`
- **Модуль:** agent
- **Базовый путь:** `treasurer/agent`
- **ApiTags:** `treasurer agent`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `treasurer/agent/:_id` | - |

### AuthOneCController

- **Файл:** `modules/auth/web/one-c/auth-one-c.controller.ts`
- **Модуль:** auth
- **Базовый путь:** `1c/auth`
- **ApiTags:** `1C auth`
- **Endpoints:** 2

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `1c/auth/login` | - |
| `POST` | `1c/auth/refresh-token` | - |

### AuthRPCController

- **Файл:** `modules/auth/rpc/auth-rpc.controller.ts`
- **Модуль:** auth
- **Endpoints:** 0

### AuthSiteController

- **Файл:** `modules/auth/web/site/auth-site.controller.ts`
- **Модуль:** auth
- **Базовый путь:** `auth`
- **ApiTags:** `auth`
- **Endpoints:** 9

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `auth/registration` | - |
| `POST` | `auth/registration/re-send` | - |
| `POST` | `auth/registration/confirm` | - |
| `POST` | `auth/login` | - |
| `POST` | `auth/restore` | - |
| `POST` | `auth/confirm/restore` | - |
| `POST` | `auth/login-external` | - |
| `POST` | `auth/logout` | - |
| `POST` | `auth/refresh-token` | - |

### CodeRPCController

- **Файл:** `modules/code/rpc/code-rpc.controller.ts`
- **Модуль:** code
- **Endpoints:** 0

### CommentManagerController

- **Файл:** `modules/comment/web/manager/comment-manager.controller.ts`
- **Модуль:** comment
- **Базовый путь:** `manager/comment`
- **ApiTags:** `manager comment`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `manager/comment` | - |
| `GET` | `manager/comment/entities-with-unread-comments` | - |
| `POST` | `manager/comment` | - |
| `PUT` | `manager/comment/mark-as-read` | - |
| `PATCH` | `manager/comment/:_id` | - |
| `DELETE` | `manager/comment/:_id` | - |

### CommentProviderController

- **Файл:** `modules/comment/web/provider/comment-provider.controller.ts`
- **Модуль:** comment
- **Базовый путь:** `provider/comment`
- **ApiTags:** `provider comment`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `provider/comment` | - |
| `GET` | `provider/comment/entities-with-unread-comments` | - |
| `POST` | `provider/comment` | - |
| `PUT` | `provider/comment/mark-as-read` | - |
| `PATCH` | `provider/comment/:_id` | - |
| `DELETE` | `provider/comment/:_id` | - |

### CommentRpcController

- **Файл:** `modules/comment/rpc/comment-rpc.controller.ts`
- **Модуль:** comment
- **Endpoints:** 0

### CommentSiteController

- **Файл:** `modules/comment/web/site/comment-site.controller.ts`
- **Модуль:** comment
- **Базовый путь:** `comment`
- **ApiTags:** `comment`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `comment` | - |
| `GET` | `comment/unread` | - |
| `GET` | `comment/entities-with-unread-comments` | - |
| `POST` | `comment` | - |
| `PUT` | `comment/mark-as-read` | - |
| `PATCH` | `comment/:_id` | - |

### ComplianceHistoryCOController

- **Файл:** `modules/compliance-history/web/compliance-officer/compliance-history-co.controller.ts`
- **Модуль:** compliance-history
- **Базовый путь:** `admin/compliance-officer/clients`
- **ApiTags:** `Compliance Officer - Clients`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/compliance-officer/clients` | - |
| `GET` | `admin/compliance-officer/clients/xlsx` | - |
| `GET` | `admin/compliance-officer/clients/:_id` | - |
| `GET` | `admin/compliance-officer/clients/:_id/requests` | - |
| `GET` | `admin/compliance-officer/clients/:_id/requests/xlsx` | - |
| `GET` | `admin/compliance-officer/clients/:_id/organization-card` | - |

### ComplianceHistoryICOController

- **Файл:** `modules/compliance-history/web/internal-compliance-officer/compliance-history-ico.controller.ts`
- **Модуль:** compliance-history
- **Базовый путь:** `admin/internal-compliance-officer/clients`
- **ApiTags:** `Internal Compliance Officer - Clients`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/internal-compliance-officer/clients` | - |
| `GET` | `admin/internal-compliance-officer/clients/xlsx` | - |
| `GET` | `admin/internal-compliance-officer/clients/:_id` | - |
| `GET` | `admin/internal-compliance-officer/clients/:_id/requests` | - |
| `GET` | `admin/internal-compliance-officer/clients/:_id/requests/xlsx` | - |
| `GET` | `admin/internal-compliance-officer/clients/:_id/organization-card` | - |

### ConfigurationAdminController

- **Файл:** `modules/configuration/web/admin/configuration-admin.controller.ts`
- **Модуль:** configuration
- **Базовый путь:** `admin/configuration`
- **ApiTags:** `admin configuration`
- **Endpoints:** 2

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/configuration` | - |
| `PATCH` | `admin/configuration` | - |

### ConfigurationRpcController

- **Файл:** `modules/configuration/rpc/configuration-rpc.controller.ts`
- **Модуль:** configuration
- **Endpoints:** 0

### ContractAdminController

- **Файл:** `modules/contract/web/admin/contract-admin.controller.ts`
- **Модуль:** contract
- **Базовый путь:** `admin/contract`
- **ApiTags:** `admin, manager contract`
- **Endpoints:** 9

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/contract` | - |
| `GET` | `admin/contract/full` | - |
| `GET` | `admin/contract/count` | - |
| `GET` | `admin/contract/:_id` | - |
| `POST` | `admin/contract/template` | - |
| `POST` | `admin/contract` | - |
| `PUT` | `admin/contract/:_id/accept` | - |
| `PUT` | `admin/contract/:_id/reject` | - |
| `PATCH` | `admin/contract/:_id` | - |

### ContractRpcController

- **Файл:** `modules/contract/rpc/contract-rpc.controller.ts`
- **Модуль:** contract
- **Endpoints:** 0

### ContractSiteController

- **Файл:** `modules/contract/web/site/contract-site.controller.ts`
- **Модуль:** contract
- **Базовый путь:** `contract`
- **ApiTags:** `contract`
- **Endpoints:** 10

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `contract` | - |
| `GET` | `contract/full/:organization` | - |
| `GET` | `contract/count` | - |
| `GET` | `contract/one` | - |
| `GET` | `contract/one/template` | - |
| `GET` | `contract/:_id` | - |
| `GET` | `contract/:_id/diadoc-status` | - |
| `POST` | `contract` | - |
| `POST` | `contract/:_id/sign-via-diadoc` | - |
| `PUT` | `contract/:_id` | - |

### ContractTreasurerController

- **Файл:** `modules/contract/web/treasurer/contract-treasurer.controller.ts`
- **Модуль:** contract
- **ApiTags:** `treasurer contract`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `full` | - |

### CounterpartyController

- **Файл:** `modules/counterparty/web/counterparty.controller.ts`
- **Модуль:** counterparty
- **Базовый путь:** `counterparty`
- **ApiTags:** `Counterparty`
- **Endpoints:** 15

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `counterparty/list` | - |
| `GET` | `counterparty/:id` | Get counterparties list |
| `GET` | `counterparty/:id/approval-indicator` | - |
| `GET` | `counterparty/:id/can-skip-compliance` | [TEST] Get approval history indicator (6-month rule) |
| `GET` | `counterparty/:id/requests` | [TEST] Remove FormPayment from counterparty |
| `GET` | `counterparty/:id/requests/xlsx` | Get counterparty requests history |
| `POST` | `counterparty/create` | Get counterparty by ID |
| `POST` | `counterparty/find-or-create` | [TEST] Check if can skip external compliance |
| `POST` | `counterparty/:id/form-payment` | [TEST] Find or create counterparty from bank details |
| `PATCH` | `counterparty/:id` | Create new counterparty |
| `PATCH` | `counterparty/:id/bank/:bankUuid/account` | Delete counterparty |
| `PATCH` | `counterparty/:id/bank/:bankUuid/account/:accountUuid` | - |
| `DELETE` | `counterparty/:id` | Update counterparty |
| `DELETE` | `counterparty/:id/bank/:bankUuid/account/:accountUuid` | Add account to existing bank |
| `DELETE` | `counterparty/:id/form-payment/:formPaymentId` | [TEST] Add FormPayment to counterparty |

### CurrencyAdminController

- **Файл:** `modules/currency/web/admin/currency-admin.controller.ts`
- **Модуль:** currency
- **Базовый путь:** `admin/currency`
- **ApiTags:** `admin currency`
- **Endpoints:** 4

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/currency` | - |
| `GET` | `admin/currency/count` | - |
| `GET` | `admin/currency/rate` | - |
| `PATCH` | `admin/currency/:_id` | - |

### CurrencyRPCController

- **Файл:** `modules/currency/rpc/currency-rpc.controller.ts`
- **Модуль:** currency
- **Endpoints:** 0

### CurrencySiteController

- **Файл:** `modules/currency/web/site/currency-site.controller.ts`
- **Модуль:** currency
- **Базовый путь:** `currency`
- **ApiTags:** `currency`
- **Endpoints:** 4

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `currency` | - |
| `GET` | `currency/dashboard-rate` | - |
| `GET` | `currency/count` | - |
| `GET` | `currency/:symbol/:source` | - |

### DiadocController

- **Файл:** `modules/diadoc/web/diadoc.controller.ts`
- **Модуль:** diadoc
- **Базовый путь:** `diadoc`
- **ApiTags:** `diadoc`
- **Endpoints:** 5

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `diadoc/health` | - |
| `GET` | `diadoc/metrics` | - |
| `POST` | `diadoc/webhook` | - |
| `POST` | `diadoc/metrics/reset` | - |
| `POST` | `diadoc/check-status` | - |

### DiadocWebhookExampleController

- **Файл:** `modules/diadoc/examples/handle-webhook.example.ts`
- **Модуль:** diadoc
- **Базовый путь:** `diadoc-webhook-example`
- **ApiTags:** `diadoc-webhook-example`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `diadoc-webhook-example` | - |

### FileAdminController

- **Файл:** `modules/file/web/admin/file-admin.controller.ts`
- **Модуль:** file
- **Базовый путь:** `admin/file-store`
- **ApiTags:** `file-store admin`
- **Endpoints:** 3

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/file-store/preview/:_id` | - |
| `POST` | `admin/file-store/upload` | - |
| `POST` | `admin/file-store/upload/pdf` | - |

### FileEventController

- **Файл:** `modules/file/event/file-event.controller.ts`
- **Модуль:** file
- **Endpoints:** 0

### FileOneCController

- **Файл:** `modules/file/web/one-c/file-one-c.controller.ts`
- **Модуль:** file
- **Базовый путь:** `1c/file-store`
- **ApiTags:** `1C file-store`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `1c/file-store/preview/:_id` | - |

### FileProviderController

- **Файл:** `modules/file/web/provider/file-provider.controller.ts`
- **Модуль:** file
- **Базовый путь:** `admin/provider/file-store`
- **ApiTags:** `file-store provider`
- **Endpoints:** 3

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/provider/file-store/preview/private/:form/:filePath` | - |
| `POST` | `admin/provider/file-store/upload` | - |
| `POST` | `admin/provider/file-store/upload/pdf` | - |

### FileRpcController

- **Файл:** `modules/file/rpc/file-rpc.controller.ts`
- **Модуль:** file
- **Endpoints:** 0

### FileSiteController

- **Файл:** `modules/file/web/site/file-site.controller.ts`
- **Модуль:** file
- **Базовый путь:** `file-store`
- **ApiTags:** `file-store`
- **Endpoints:** 8

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `file-store/preview/private/:_id` | - |
| `GET` | `file-store/preview/private/contract/:contract` | - |
| `GET` | `file-store/preview/private/:form/:filePath` | - |
| `GET` | `file-store/preview/private/:_id/string` | - |
| `GET` | `file-store/preview/:_id` | - |
| `GET` | `file-store/static/:type/:name` | - |
| `POST` | `file-store/upload` | - |
| `POST` | `file-store/upload/pdf` | - |

### FormPaymentAdminController

- **Файл:** `modules/form-payment/web/admin/form-payment-admin.controller.ts`
- **Модуль:** form-payment
- **Базовый путь:** `admin/form-payment`
- **ApiTags:** `admin form payment`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/form-payment` | - |
| `GET` | `admin/form-payment/count` | - |
| `GET` | `admin/form-payment/xlsx` | - |
| `GET` | `admin/form-payment/:_id/xlsx` | - |
| `GET` | `admin/form-payment/:_id` | - |
| `PATCH` | `admin/form-payment/:_id` | - |

### FormPaymentComplianceOfficerController

- **Файл:** `modules/form-payment/web/compliance-officer/form-payment-compliance-officer.controller.ts`
- **Модуль:** form-payment
- **Базовый путь:** `admin/compliance-officer/form-payment`
- **ApiTags:** `compliance officer form payment`
- **Endpoints:** 12

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/compliance-officer/form-payment` | - |
| `GET` | `admin/compliance-officer/form-payment/count` | - |
| `GET` | `admin/compliance-officer/form-payment/xlsx` | - |
| `GET` | `admin/compliance-officer/form-payment/:_id/xlsx` | - |
| `GET` | `admin/compliance-officer/form-payment/:_id` | - |
| `POST` | `admin/compliance-officer/form-payment/:_id/analyze-counterparty` | - |
| `PUT` | `admin/compliance-officer/form-payment/:_id/cancel` | - |
| `PUT` | `admin/compliance-officer/form-payment/:_id/form/start` | - |
| `PUT` | `admin/compliance-officer/form-payment/:_id/form/stop` | - |
| `PUT` | `admin/compliance-officer/form-payment/:_id/form/accept` | - |
| `PUT` | `admin/compliance-officer/form-payment/:_id/form/reject` | - |
| `PATCH` | `admin/compliance-officer/form-payment/:_id` | - |

### FormPaymentInternalComplianceOfficerController

- **Файл:** `modules/form-payment/web/internal-compliance-officer/form-payment-internal-compliance-officer.controller.ts`
- **Модуль:** form-payment
- **Базовый путь:** `admin/internal-compliance-officer/form-payment`
- **ApiTags:** `Internal compliance officer form payment`
- **Endpoints:** 10

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/internal-compliance-officer/form-payment` | - |
| `GET` | `admin/internal-compliance-officer/form-payment/count` | - |
| `GET` | `admin/internal-compliance-officer/form-payment/xlsx` | - |
| `GET` | `admin/internal-compliance-officer/form-payment/:_id/xlsx` | - |
| `GET` | `admin/internal-compliance-officer/form-payment/:_id` | - |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/form/start` | - |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/form/stop` | - |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/form/accept` | - |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/form/reject` | - |
| `PUT` | `admin/internal-compliance-officer/form-payment/:_id/cancel` | - |

### FormPaymentManagerController

- **Файл:** `modules/form-payment/web/manager/form-payment-manager.controller.ts`
- **Модуль:** form-payment
- **Базовый путь:** `admin/manager/form-payment`
- **ApiTags:** `manager form payment`
- **Endpoints:** 52

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/manager/form-payment` | - |
| `GET` | `admin/manager/form-payment/count` | - |
| `GET` | `admin/manager/form-payment/xlsx` | - |
| `GET` | `admin/manager/form-payment/:_id/xlsx` | - |
| `GET` | `admin/manager/form-payment/:_id` | - |
| `GET` | `admin/manager/form-payment/:_id/report/diadoc-status` | - |
| `POST` | `admin/manager/form-payment/:_id/report/sign-via-diadoc` | - |
| `POST` | `admin/manager/form-payment/:_id/generate-agent-report` | - |
| `PUT` | `admin/manager/form-payment/:_id/completed` | - |
| `PUT` | `admin/manager/form-payment/:_id/form/reject` | - |
| `PUT` | `admin/manager/form-payment/:_id/form/start` | - |
| `PUT` | `admin/manager/form-payment/:_id/form/stop` | - |
| `PUT` | `admin/manager/form-payment/:_id/form/accept` | - |
| `PUT` | `admin/manager/form-payment/:_id/cancel` | - |
| `PUT` | `admin/manager/form-payment/:_id/make-important` | - |
| `PUT` | `admin/manager/form-payment/:_id/make-unimportant` | - |
| `PUT` | `admin/manager/form-payment/:_id/order/start` | - |
| `PUT` | `admin/manager/form-payment/:_id/order/stop` | - |
| `PUT` | `admin/manager/form-payment/:_id/order/accept` | - |
| `PUT` | `admin/manager/form-payment/:_id/order/reject` | - |
| `PUT` | `admin/manager/form-payment/:_id/order/signing` | - |
| `PUT` | `admin/manager/form-payment/:_id/order/generate` | - |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/start` | - |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/stop` | - |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/accept` | - |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/reject` | - |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/revoke` | - |
| `PUT` | `admin/manager/form-payment/:_id/order-advance/signing` | - |
| `PUT` | `admin/manager/form-payment/:_id/payment/received` | - |
| `PUT` | `admin/manager/form-payment/:_id/payment/stop` | - |
| `PUT` | `admin/manager/form-payment/:_id/payment/start` | - |
| `PUT` | `admin/manager/form-payment/:_id/payment/return-to-sent` | - |
| `PUT` | `admin/manager/form-payment/:_id/payment/sent` | - |
| `PUT` | `admin/manager/form-payment/:_id/payment/cancel` | - |
| `PUT` | `admin/manager/form-payment/:_id/shipment/start` | - |
| `PUT` | `admin/manager/form-payment/:_id/shipment/stop` | - |
| `PUT` | `admin/manager/form-payment/:_id/shipment/accept` | - |
| `PUT` | `admin/manager/form-payment/:_id/shipment/reject` | - |
| `PUT` | `admin/manager/form-payment/:_id/report/start` | - |
| `PUT` | `admin/manager/form-payment/:_id/report/stop` | - |
| `PUT` | `admin/manager/form-payment/:_id/report/accept` | - |
| `PUT` | `admin/manager/form-payment/:_id/report/reject` | - |
| `PUT` | `admin/manager/form-payment/:_id/report/revoke` | - |
| `PUT` | `admin/manager/form-payment/:_id/report/signing` | - |
| `PUT` | `admin/manager/form-payment/:_id/report` | - |
| `PUT` | `admin/manager/form-payment/:_id/refund/init` | - |
| `PUT` | `admin/manager/form-payment/:_id/refund/cancel` | - |
| `PUT` | `admin/manager/form-payment/:_id/refund/start` | - |
| `PUT` | `admin/manager/form-payment/:_id/refund/stop` | - |
| `PUT` | `admin/manager/form-payment/:_id/refund/sent` | - |
| `PATCH` | `admin/manager/form-payment/:_id` | - |
| `PATCH` | `admin/manager/form-payment/:_id/rate` | - |

### FormPaymentOneCController

- **Файл:** `modules/form-payment/web/one-c/form-payment-one-c.controller.ts`
- **Модуль:** form-payment
- **Базовый путь:** `1c/form-payment`
- **ApiTags:** `1C form-payment`
- **Endpoints:** 2

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `1c/form-payment` | - |
| `GET` | `1c/form-payment/count` | - |

### FormPaymentProviderController

- **Файл:** `modules/form-payment/web/provider/form-payment-provider.controller.ts`
- **Модуль:** form-payment
- **Базовый путь:** `admin/provider/form-payment`
- **ApiTags:** `provider form payment`
- **Endpoints:** 15

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/provider/form-payment` | - |
| `GET` | `admin/provider/form-payment/count` | - |
| `GET` | `admin/provider/form-payment/xlsx` | - |
| `GET` | `admin/provider/form-payment/:_id/xlsx` | - |
| `GET` | `admin/provider/form-payment/:_id` | - |
| `POST` | `admin/provider/form-payment` | - |
| `PUT` | `admin/provider/form-payment/:_id/payment/received` | - |
| `PUT` | `admin/provider/form-payment/:_id/payment/start` | - |
| `PUT` | `admin/provider/form-payment/:_id/payment/stop` | - |
| `PUT` | `admin/provider/form-payment/:_id/payment/sent` | - |
| `PUT` | `admin/provider/form-payment/:_id/payment/cancel` | - |
| `PUT` | `admin/provider/form-payment/:_id/make-important` | - |
| `PUT` | `admin/provider/form-payment/:_id/make-unimportant` | - |
| `PUT` | `admin/provider/form-payment/:_id/form/manager` | - |
| `PATCH` | `admin/provider/form-payment/:_id` | - |

### FormPaymentRpcController

- **Файл:** `modules/form-payment/rpc/form-payment-rpc.controller.ts`
- **Модуль:** form-payment
- **Endpoints:** 0

### FormPaymentSiteController

- **Файл:** `modules/form-payment/web/site/form-payment-site.controller.ts`
- **Модуль:** form-payment
- **Базовый путь:** `form-payment`
- **ApiTags:** `form-payment`
- **Endpoints:** 33

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `form-payment` | - |
| `GET` | `form-payment/count` | - |
| `GET` | `form-payment/export/payment-received` | - |
| `GET` | `form-payment/by-order-accepted` | - |
| `GET` | `form-payment/by-order-accepted/count` | - |
| `GET` | `form-payment/:_id` | - |
| `GET` | `form-payment/:_id/payment-order/diadoc-status` | - |
| `GET` | `form-payment/:_id/hs-codes` | - |
| `GET` | `form-payment/:_id/suggested-providers` | - |
| `GET` | `form-payment/:_id/sign-method` | - |
| `POST` | `form-payment` | - |
| `POST` | `form-payment/:_id/payment-order/sign-via-diadoc` | - |
| `POST` | `form-payment/:_id/copy` | - |
| `POST` | `form-payment/import` | - |
| `POST` | `form-payment/:_id/invoices` | - |
| `PUT` | `form-payment/:_id/cancel` | - |
| `PUT` | `form-payment/:_id/payments` | - |
| `PUT` | `form-payment/:_id/form/accept` | - |
| `PUT` | `form-payment/:_id/form/accept-corrections` | - |
| `PUT` | `form-payment/:_id/order` | - |
| `PUT` | `form-payment/:_id/order-advance` | - |
| `PUT` | `form-payment/:_id/report` | - |
| `PUT` | `form-payment/:_id/shipment` | - |
| `PUT` | `form-payment/:_id/shipment/accept` | - |
| `PUT` | `form-payment/:_id/additional` | - |
| `PUT` | `form-payment/:_id/signing-order-verification-treasurer` | - |
| `PATCH` | `form-payment/:_id/rate` | - |
| `PATCH` | `form-payment/:_id/form` | - |
| `PATCH` | `form-payment/:_id/invoice/:uuid/hs-codes` | - |
| `PATCH` | `form-payment/:_id/invoices/:uuid` | - |
| `PATCH` | `form-payment/:_id/sign-method` | - |
| `DELETE` | `form-payment/:formPaymentId/files/:fileId` | - |
| `DELETE` | `form-payment/:_id/invoices/:uuid` | - |

### FormPaymentTreasurerController

- **Файл:** `modules/form-payment/web/treasurer/form-payment-treasurer.controller.ts`
- **Модуль:** form-payment
- **Базовый путь:** `admin/treasurer/form-payment`
- **ApiTags:** `treasurer form payment`
- **Endpoints:** 10

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/treasurer/form-payment` | - |
| `GET` | `admin/treasurer/form-payment/:_id` | - |
| `POST` | `admin/treasurer/form-payment/:_id/treasurer-order/upload` | - |
| `PUT` | `admin/treasurer/form-payment/:_id/signing-order-treasurer` | - |
| `PUT` | `admin/treasurer/form-payment/:_id/return-to-payment-sent-treasurer` | - |
| `PUT` | `admin/treasurer/form-payment/:_id/order-waiting-correction-treasurer` | - |
| `PUT` | `admin/treasurer/form-payment/:_id/complete-from-verification-treasurer` | - |
| `PUT` | `admin/treasurer/form-payment/:_id/return-to-signing-order-treasurer` | - |
| `PATCH` | `admin/treasurer/form-payment/:_id/confirm-payment` | - |
| `DELETE` | `admin/treasurer/form-payment/:_id/treasurer-order` | - |

### HsCodeComplianceOfficerController

- **Файл:** `modules/hs-code/web/compliance-officer/hs-code-compliance-officer.controller.ts`
- **Модуль:** hs-code
- **Базовый путь:** `admin/compliance-officer/hs-code`
- **ApiTags:** `hs-code`
- **Endpoints:** 5

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `admin/compliance-officer/hs-code` | - |
| `PATCH` | `admin/compliance-officer/hs-code/:id` | - |
| `PATCH` | `admin/compliance-officer/hs-code/:id/deactivate` | - |
| `PATCH` | `admin/compliance-officer/hs-code/:id/activate` | - |
| `DELETE` | `admin/compliance-officer/hs-code/:id` | - |

### HsCodeRootController

- **Файл:** `modules/hs-code/web/root/hs-code-root.controller.ts`
- **Модуль:** hs-code
- **Базовый путь:** `admin/root/hs-code`
- **ApiTags:** `hs-code`
- **Endpoints:** 2

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `admin/root/hs-code/import` | - |
| `DELETE` | `admin/root/hs-code/:id` | - |

### HsCodeSiteController

- **Файл:** `modules/hs-code/web/site/hs-code-site.controller.ts`
- **Модуль:** hs-code
- **Базовый путь:** `hs-code`
- **ApiTags:** `hs-code`
- **Endpoints:** 3

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `hs-code` | - |
| `GET` | `hs-code/count` | - |
| `GET` | `hs-code/:code` | - |

### LiquidityAdminController

- **Файл:** `modules/liquidity/web/admin/liquidity-admin.controller.ts`
- **Модуль:** liquidity
- **Базовый путь:** `admin/liquidity`
- **ApiTags:** `admin liquidity`
- **Endpoints:** 3

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/liquidity/findOne` | - |
| `POST` | `admin/liquidity/convert` | - |
| `PATCH` | `admin/liquidity/:_id` | - |

### LiquidityComplianceOfficerController

- **Файл:** `modules/liquidity/web/compliance-officer/liquidity-compliance-officer.controller.ts`
- **Модуль:** liquidity
- **Базовый путь:** `admin/compliance-officer/liquidity`
- **ApiTags:** `compliance officer liquidity`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/compliance-officer/liquidity/findOne` | - |

### LiquidityInternalComplianceOfficerController

- **Файл:** `modules/liquidity/web/internal-compliance-officer/liquidity-internal-compliance-officer.controller.ts`
- **Модуль:** liquidity
- **Базовый путь:** `admin/internal-compliance-officer/liquidity`
- **ApiTags:** `internal compliance officer liquidity`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/internal-compliance-officer/liquidity/findOne` | - |

### LiquidityManagerController

- **Файл:** `modules/liquidity/web/manager/liquidity-manager.controller.ts`
- **Модуль:** liquidity
- **Базовый путь:** `admin/manager/liquidity`
- **ApiTags:** `manager liquidity`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/manager/liquidity/findOne` | - |

### LiquidityProviderController

- **Файл:** `modules/liquidity/web/provider/liquidity-provider.controller.ts`
- **Модуль:** liquidity
- **Базовый путь:** `admin/provider/liquidity`
- **ApiTags:** `provider liquidity`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/provider/liquidity/findOne` | - |

### LiquidityRpcController

- **Файл:** `modules/liquidity/rpc/liquidity-rpc.controller.ts`
- **Модуль:** liquidity
- **Endpoints:** 0

### LiquiditySiteController

- **Файл:** `modules/liquidity/web/site/liquidity-site.controller.ts`
- **Модуль:** liquidity
- **Базовый путь:** `liquidity`
- **ApiTags:** `liquidity`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `liquidity` | - |

### MailRpcController

- **Файл:** `modules/mail/rpc/mail-rpc.controller.ts`
- **Модуль:** mail
- **Endpoints:** 0

### OrganizationInternalComplianceOfficerController

- **Файл:** `modules/organization/web/internal-compliance-officer/organization-internal-compliance-officer.controller.ts`
- **Модуль:** organization
- **Базовый путь:** `admin/internal-compliance-officer/organization`
- **ApiTags:** `organization`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/internal-compliance-officer/organization` | - |
| `GET` | `admin/internal-compliance-officer/organization/count` | - |
| `GET` | `admin/internal-compliance-officer/organization/:_id` | - |
| `PUT` | `admin/internal-compliance-officer/organization/:_id/approve` | - |
| `PUT` | `admin/internal-compliance-officer/organization/:_id/un-approve` | - |
| `PUT` | `admin/internal-compliance-officer/organization/:_id/block` | - |

### OrganizationManagerController

- **Файл:** `modules/organization/web/manager/organization-manager.controller.ts`
- **Модуль:** organization
- **Базовый путь:** `admin/manager/organization`
- **ApiTags:** `manager organization`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/manager/organization` | - |
| `GET` | `admin/manager/organization/:_id` | - |
| `GET` | `admin/manager/organization/count` | - |
| `POST` | `admin/manager/organization` | - |
| `PATCH` | `admin/manager/organization/:_id` | - |
| `DELETE` | `admin/manager/organization/:_id` | - |

### OrganizationProviderController

- **Файл:** `modules/organization/web/provider/organization-provider.controller.ts`
- **Модуль:** organization
- **Базовый путь:** `admin/provider/organization`
- **ApiTags:** `provider organization`
- **Endpoints:** 6

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/provider/organization` | - |
| `GET` | `admin/provider/organization/count` | - |
| `GET` | `admin/provider/organization/:_id` | - |
| `POST` | `admin/provider/organization` | - |
| `PATCH` | `admin/provider/organization/:_id` | - |
| `DELETE` | `admin/provider/organization/:_id` | - |

### OrganizationRpcController

- **Файл:** `modules/organization/rpc/organization-rpc.controller.ts`
- **Модуль:** organization
- **Endpoints:** 0

### OrganizationSiteController

- **Файл:** `modules/organization/web/site/organization-site.controller.ts`
- **Модуль:** organization
- **Базовый путь:** `organization`
- **ApiTags:** `organization`
- **Endpoints:** 13

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `organization` | - |
| `GET` | `organization/invited` | - |
| `GET` | `organization/count` | - |
| `GET` | `organization/fetch-by-inn` | - |
| `GET` | `organization/:_id` | - |
| `POST` | `organization` | - |
| `PUT` | `organization/:_id/delegate/:delegateToSubaccount` | - |
| `PATCH` | `organization/:_id/invite-subaccount` | - |
| `PATCH` | `organization/:_id/delete-subaccount` | - |
| `PATCH` | `organization/:_id/accept-invite` | - |
| `PATCH` | `organization/:_id/reject-invite` | - |
| `PATCH` | `organization/:_id` | - |
| `DELETE` | `organization/:_id` | - |

### PaymentAdminController

- **Файл:** `modules/payment/web/admin/payment-admin.controller.ts`
- **Модуль:** payment
- **Базовый путь:** `admin/payment`
- **ApiTags:** `admin payment`
- **Endpoints:** 2

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/payment` | - |
| `DELETE` | `admin/payment` | - |

### PaymentManagerController

- **Файл:** `modules/payment/web/manager/payment-manager.controller.ts`
- **Модуль:** payment
- **Базовый путь:** `admin/manager/payment`
- **ApiTags:** `manager payment`
- **Endpoints:** 2

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/manager/payment` | - |
| `GET` | `admin/manager/payment/by-form-payment/:_id` | - |

### PaymentOneCController

- **Файл:** `modules/payment/web/one-c/payment-one-c.controller.ts`
- **Модуль:** payment
- **Базовый путь:** `1c/payment`
- **ApiTags:** `1C payment`
- **Endpoints:** 4

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `1c/payment` | - |
| `GET` | `1c/payment/count` | - |
| `POST` | `1c/payment` | - |
| `POST` | `1c/payment/many` | - |

### RecognitionEventController

- **Файл:** `modules/recognition/event/recognition-event.controller.ts`
- **Модуль:** recognition
- **Endpoints:** 0

### SocketEventController

- **Файл:** `modules/socket/event/socket-event.controller.ts`
- **Модуль:** socket
- **Endpoints:** 0

### SocketRpcController

- **Файл:** `modules/socket/rpc/socket-rpc.controller.ts`
- **Модуль:** socket
- **Endpoints:** 0

### SocketSiteController

- **Файл:** `modules/socket/web/site/socket-site.controller.ts`
- **Модуль:** socket
- **Базовый путь:** `socket`
- **ApiTags:** `socket-message`
- **Endpoints:** 4

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `socket/negotiate-connection` | Publish. |
| `OPTIONS` | `socket/message` | - |
| `OPTIONS` | `socket/message` | - |
| `OPTIONS` | `socket/message.created` | - |

### TelegramRpcController

- **Файл:** `modules/telegram/rpc/telegram-rpc.controller.ts`
- **Модуль:** telegram
- **Endpoints:** 0

### TemplateAdminController

- **Файл:** `modules/template/web/admin/template-admin.controller.ts`
- **Модуль:** template
- **Базовый путь:** `admin/templates`
- **ApiTags:** `admin templates`
- **Endpoints:** 5

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/templates` | - |
| `GET` | `admin/templates/:id` | - |
| `POST` | `admin/templates` | - |
| `PATCH` | `admin/templates/:id` | - |
| `DELETE` | `admin/templates/:id` | - |

### TemplateSiteController

- **Файл:** `modules/template/web/site/template-site.controller.ts`
- **Модуль:** template
- **Базовый путь:** `templates`
- **ApiTags:** `templates`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `templates` | - |

### TokenRPCController

- **Файл:** `modules/token/rpc/token-rpc.controller.ts`
- **Модуль:** token
- **Endpoints:** 0

### TreasurerTaskSiteController

- **Файл:** `modules/treasurer-task/web/site/treasurer-task-site.controller.ts`
- **Модуль:** treasurer-task
- **Базовый путь:** `treasurer-task`
- **ApiTags:** `treasurer task`
- **Endpoints:** 2

| Метод | Путь | Описание |
|-------|------|----------|
| `PATCH` | `treasurer-task/:formPaymentId/order-signed` | - |
| `DELETE` | `treasurer-task/:formPaymentId/order-signed` | - |

### TreasurerTaskTreasurerController

- **Файл:** `modules/treasurer-task/web/treasurer/treasurer-task-treasurer.controller.ts`
- **Модуль:** treasurer-task
- **Базовый путь:** `admin/treasurer/task`
- **ApiTags:** `treasurer task`
- **Endpoints:** 9

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `admin/treasurer/task` | - |
| `POST` | `admin/treasurer/task/:_id/generate-payment-order` | - |
| `PATCH` | `admin/treasurer/task/:_id/status` | - |
| `PATCH` | `admin/treasurer/task/:_id/exchange-rate` | - |
| `PATCH` | `admin/treasurer/task/:_id/commission` | - |
| `PATCH` | `admin/treasurer/task/:_id/order` | - |
| `PATCH` | `admin/treasurer/task/:_id/export-revenue-confirmation` | - |
| `DELETE` | `admin/treasurer/task/:_id/order` | - |
| `DELETE` | `admin/treasurer/task/:_id/export-revenue-confirmation` | - |

### VirtualAccountSiteController

- **Файл:** `modules/virtual-account/web/site/virtual-account-site.controller.ts`
- **Модуль:** virtual-account
- **Базовый путь:** `virtual-account`
- **ApiTags:** `virtual-account`
- **Endpoints:** 1

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `virtual-account` | - |

