import { AddEntityAccountToComment } from './add-entity-account-to-comment';
import { ChangeFormPaymentRefundFieldType } from './change-form-payment-refund-field-type';
import { CreateAdmin } from './create-admin';
import { CreateAgents } from './create-agents';
import { CreateConfiguration } from './create-configuration';
import { CreateLiquidity } from './create-liquidity';
import { RenameFormPaymentPaymentCondition } from './rename-form-payment-payment-condition';
import { SetFormPaymentIsOrderAccepted } from './set-form-payment-is-order-accepted';
import { UnsetIsOrderAcceptedForRefund } from './unset-is-order-accepted-for-refund';
import { MoveFormPaymentInvoiceToInvoices } from './move-form-payment-invoice-to-invoices';
import { UpdateOneCRole } from './update-one-c-role';
import { SetOrganizationIsConfirmed } from './set-organization-is-confirmed';
import { AddOrganizationStatus } from './add-organization-status';
import { SetMoveToProviderDate } from './set-move-to-provider-date';
import { UnsetIsOrderAcceptedForContractStatuses } from './unset-is-order-accepted-for-contract-statuses';
import { SetFormPaymentIsOrderAcceptedIfOrderSigned } from './set-form-payment-is-order-accepted-if-order-signed';
import { SetPlatformPaymentCondition } from './set-platform-payment-condition';
import { AddBaseFieldIntoFormIfNotExists } from './add-base-field-into-form-if-not-exists';
import { AddStageFieldIntoFormIfNotExists } from './add-stage-field-into-form-if-not-exists';
import { SetPaymentByProviderDate } from './set-payment-by-provider-date';
import { MigrateContractsToOrganization } from './migrate_contracts_to_organization';
import { AddOrganizationIsActive } from './add-organization-is-active';
import { CreateTemplatesV22 } from './create-templates-v22';
import { AddHsCodeDescriptionAndUpdateLoyalty } from './add-hs-code-description-and-update-loyalty';
import { SetDefaultInvoiceKind } from './set-default-invoice-kind';
import { AddRefOrganizationIdToFormPayments } from './add-ref-organization-id-to-form-payments';
import { CreateInitialFormPaymentStatuses } from './create-initial-form-payment-statuses';
import { CreateInitialOrganizationStatusesHistory } from './create-initial-organization-statuses-history';
import { CreateCounterparties } from './create-counterparties';
import { UpdateCounterpartyIndexes } from './update-counterparty-indexes';
import { CreateVirtualAccountsForUsers } from './create-virtual-accounts-for-users';
import { MigrateProviderToPreferedProvider } from './migrate_provider_to_prefered_provider';
import { SetPlatformPostpayMode } from './set-platform-postpay-mode';
import { UpdateFormPaymentRatePrecision } from './update-form-payment-rate-precision';
import { MigrateLiquidityToNewStructure } from './migrate-liquidity-to-new-structure';
import { SetPaymentMethodDefault } from './set-payment-method-default';
import { SetFormPaymentFixFeeRateSource } from './set-form-payment-fix-fee-rate-source';
import { RenameFormPaymentFixFeeToFixFeeCurrency } from './rename-form-payment-fix-fee-to-fix-fee-currency';
import { AddThbChfCurrencies } from './add-thb-chf-currencies';
import { SetFormPaymentIsSigningOrderSent } from './set-form-payment-is-signing-order-sent';
import { MigrateThbChfToNewStructure } from './migrate-thb-chf-to-new-structure';
import { AddDiadocFields } from './add-diadoc-fields';

export const migrations = [
  CreateAdmin,
  CreateAgents,
  CreateLiquidity,
  SetFormPaymentIsOrderAccepted,
  CreateConfiguration,
  ChangeFormPaymentRefundFieldType,
  SetOrganizationIsConfirmed,
  UnsetIsOrderAcceptedForRefund,
  MoveFormPaymentInvoiceToInvoices,
  AddOrganizationStatus,
  UpdateOneCRole,
  RenameFormPaymentPaymentCondition,
  AddEntityAccountToComment,
  SetMoveToProviderDate,
  UnsetIsOrderAcceptedForContractStatuses,
  SetFormPaymentIsOrderAcceptedIfOrderSigned,
  SetPlatformPaymentCondition,
  AddBaseFieldIntoFormIfNotExists,
  AddStageFieldIntoFormIfNotExists,
  SetPaymentByProviderDate,
  MigrateContractsToOrganization,
  AddOrganizationIsActive,
  CreateTemplatesV22,
  AddHsCodeDescriptionAndUpdateLoyalty,
  SetDefaultInvoiceKind,
  AddRefOrganizationIdToFormPayments,
  CreateInitialFormPaymentStatuses,
  CreateInitialOrganizationStatusesHistory,
  CreateCounterparties,
  UpdateCounterpartyIndexes, // V-40: Fix indexes from clientOrganization to createdBy
  CreateVirtualAccountsForUsers,
  MigrateProviderToPreferedProvider,
  SetPlatformPostpayMode,
  UpdateFormPaymentRatePrecision,
  MigrateLiquidityToNewStructure, // Migrate export and commitments to new structure with providerOrganization array
  SetPaymentMethodDefault, // Set default paymentMethod = PAY_IN_RUBLES for existing records
  SetFormPaymentFixFeeRateSource,
  RenameFormPaymentFixFeeToFixFeeCurrency,
  AddThbChfCurrencies,
  SetFormPaymentIsSigningOrderSent,
  MigrateThbChfToNewStructure, // Проверяет и обновляет структуру валют THB и CHF в стаканах ликвидности
  AddDiadocFields, // VF-2: Добавление полей Diadoc для интеграции с ЭДО
];
