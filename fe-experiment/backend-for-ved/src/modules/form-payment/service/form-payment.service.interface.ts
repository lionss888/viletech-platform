import {
  IFormBankDetails,
  IFormPayment,
  IFormPaymentBase,
  IFormPaymentByOrderAccepted,
  IFormPaymentCurrency,
  IFormPaymentInvoice,
  IFormPaymentTotals,
  IFormPaymentTransactionAdd,
  IFormPaymentTransactionRemove,
  IFormPaymentOrganization,
} from 'lib/interfaces/models/form-payment.interface';
import { IBaseOptions, IBaseQuery, IBaseService, UpdatePartial } from 'lib/services/base/base.service.interface';
import { FeatureContext } from 'lib/classes/feature-context.class';
import {
  FormPaymentCondition,
  FormPaymentDirection,
  FormPaymentStage,
  FormPaymentStatus,
  FormPaymentStatusUpdateByUser,
  PlatformPostpayMode,
  FormPaymentPaymentMethod,
} from '../../../lib/enums/models/form-payment.enums';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import { IAccount } from '../../../lib/interfaces/models/account.interface';
import { IAgent } from '../../../lib/interfaces/models/agent.interface';
import { IOrganization, IOrganizationSubaccount } from 'lib/interfaces/models/organization.interface';
import { IPaginateOptions, IPaginateResult } from '../../../lib/interfaces/paginate.interface';
import { SocketMessageAction } from '../../../lib/enums/models/socket.enum';
import { Organization } from 'modules/organization/service/organization.schema';
import { ICryptoRequisites } from 'lib/interfaces/crypto-requisites.interface';
import {
  OrganizationSignerPositionType,
  OrganizationStatus,
  OrganizationBusinessFormType,
} from '../../../lib/enums/models/organization.enums';
import { IRequisites } from 'lib/interfaces/bank-requisites.interface';
import { Cursor, FilterQuery, QueryOptions, Types } from 'mongoose';
import { IPayment } from '../../../lib/interfaces/models/payment.interface';
import { IHsCode } from 'lib/interfaces/models/hs-code.interface';
import { JobId } from '../../../lib/services/chatgpt/chatgpt.service.interface';
import { PaymentChargeType } from 'lib/enums/models/payment.enums';
import { FormPayment } from './form-payment.schema';

export interface IFormPaymentService
  extends IBaseService<IFormPayment, IFormPaymentQuery, IBaseOptions, IFormPaymentCreate, IFormUpdate> {
  findForLiquidityGlass(
    findData: IFormPaymentForLiquidityGlassQuery,
    paginateOptions: IPaginateOptions,
  ): Promise<IPaginateResult<IFormPaymentByOrderAccepted>>;

  updateFormByUser(findData: IFormPaymentQuery, updateData: IFormUpdate, options?: IBaseOptions): Promise<IFormPayment>;

  cancelFormByUser(findData: IFormPaymentQuery, updateData: IFormUpdate, options?: IBaseOptions): Promise<IFormPayment>;

  orderByUser(findData: IFormPaymentQuery, updateData: IFormUpdate, options?: IBaseOptions): Promise<IFormPayment>;

  advanceOrderByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment>;

  updatePaymentsByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment>;

  updateAdditionalByUser(
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment>;

  addInvoiceByUser(
    findData: IFormPaymentQuery,
    invoice: IFormPaymentInvoice,
    options?: IBaseOptions,
  ): Promise<IFormPayment>;

  removeInvoiceByUser(findData: IFormPaymentQuery, invoiceUuid: string, options?: IBaseOptions): Promise<IFormPayment>;

  updateInvoiceByUser(
    findData: IFormPaymentQuery,
    invoiceUuid: string,
    updateData: Partial<IFormPaymentInvoice>,
  ): Promise<IFormPayment>;

  reportByUser(findData: IFormPaymentQuery, updateData: IFormUpdate, options?: IBaseOptions): Promise<IFormPayment>;

  reportByAdmin(
    findData: IFormPaymentQuery,
    updateData: IFormUpdateReportByAdmin,
    options?: IBaseOptions,
  ): Promise<IFormPayment>;

  shipmentByUser(findData: IFormPaymentQuery, updateData: IFormUpdate, options?: IBaseOptions): Promise<IFormPayment>;

  updateByAdmins(
    ctx: FeatureContext,
    findData: IFormPaymentQuery,
    updateData: IFormUpdate,
    options?: IBaseOptions,
  ): Promise<IFormPayment>;

  applyPaymentFromPaymentService(payload: IApplyPaymentPayload): Promise<void>;

  sendFormPaymentNotifications(updatedForm: IFormPayment, action: SocketMessageAction): Promise<void>;

  updateOneRpc(findData: IFormPaymentQuery, updateData: IFormUpdate, options?: IBaseOptions): Promise<IFormPayment>;

  updateManyRpc(findData: IFormPaymentQuery, updateData: IFormUpdate): Promise<void>;

  syncOrganizationSubaccountsRpc(data: IFormSyncOrganizationSubaccountsRpc): Promise<void>;

  findCursor(
    findData: IFormPaymentQuery,
    options?: IBaseOptions,
  ): Promise<Cursor<IFormPaymentForXlsx, QueryOptions<IFormPayment>>>;

  copyForm(sourceFormId: string, account: string, amount: number): Promise<IFormPayment>;

  updateInvoiceHsCodes(formId: string, accountId: string, invoiceUuid: string, codes: string[]): Promise<IFormPayment>;

  getAggregatedHsCodes(
    formId: string,
    accountId?: string,
  ): Promise<{
    hsCodes: Array<{
      code: string;
      description?: string;
      loyalty?: string;
      isManual: boolean;
      isActive: boolean;
      invoiceCount: number;
    }>;
    totalCodes: number;
    manualCodesCount: number;
    inactiveCodesCount: number;
    canApprove: boolean;
  }>;

  getSuggestedProviders(
    formId: string,
    userRole: string,
    accountId?: string,
  ): Promise<
    Array<{
      _id: string;
      name: string;
      inn?: string;
      exactMatches: number;
      prefixMatches: number;
      totalCoverage: number;
      coveragePercent: number;
      coveredCodes: string[];
      isPreferred: boolean;
    }>
  >;

  validateHsCodesForApproval(formId: string): Promise<{ valid: boolean; errors: string[] }>;

  updateSnapshotsOnDeactivate(hsCode: string, hsCodeId: string): Promise<void>;

  updateSnapshotsOnActivate(hsCode: IHsCode): Promise<void>;

  updateSnapshotsOnDelete(hsCode: string): Promise<void>;

  analyzeCounterpartyWithChatGpt(formPaymentId: string, accountId?: string): Promise<JobId>;

  convertFormAmountToCurrency(form: IFormPayment, targetCurrency: AllCurrencies): Promise<number | undefined>;
  enrichCounterpartyFromRegistryForOrder(formPayment: IFormPayment): Promise<void>;
  enrichCounterpartyFromRegistryForManager(formPayment: IFormPayment): Promise<void>;
  enrichCounterpartyFromRegistryForSite(formPayment: IFormPayment): Promise<void>;
  findOneOrExceptionForManager(findData: IFormPaymentQuery, options?: IBaseOptions): Promise<IFormPayment | undefined>;
  findOneOrExceptionForOrder(findData: IFormPaymentQuery, options?: IBaseOptions): Promise<IFormPayment | undefined>;
  findOneOrExceptionForSite(findData: IFormPaymentQuery, options?: IBaseOptions): Promise<IFormPayment | undefined>;

  // Builds a query for searching deals with organization access.
  buildQueryWithOrganizationAccess(
    baseQuery: Partial<IFormPaymentQuery>,
    accountId: string,
  ): Promise<FilterQuery<FormPayment>>;

  // Checks user access to a deal (including subaccount and organization owner checks).
  checkFormPaymentAccess(formPaymentId: string, accountId: string): Promise<IFormPayment>;

  /**
   * Fixes exchange rate and commission for a single form payment.
   * - mode='auto' uses account rate settings (with optional rate override)
   * - mode='manual' uses provided rate/fees
   */
  fixRate(
    formPaymentId: string,
    options?: {
      mode?: 'auto' | 'manual';
      rate?: number; // used in manual mode or as override for auto
      payDate?: Date; // postpay: payment order date from provider
      feePercentBps?: number; // manual mode
      feeFixMinor?: number; // manual mode (see FixRateDto)
      feeFixCurrency?: AllCurrencies; // manual mode
      feeFixRate?: number; // manual mode
    },
  ): Promise<IFormPayment>;

  /**
   * Проверяет, является ли клиент корпоративным
   * @param formPayment Форма платежа с загруженным account
   */
  isCorporateClient(formPayment: IFormPayment): boolean;

  // VF-2: Отправка поручения на подписание через Diadoc
  signPaymentOrderViaDiadoc(findData: IFormPaymentQuery, recipientInn: string): Promise<IFormPayment>;

  // VF-2: Отправка отчёта на подписание через Diadoc
  signReportViaDiadoc(findData: IFormPaymentQuery, recipientInn: string): Promise<IFormPayment>;

  // VF-2: Поиск FormPayment по Diadoc document ID (для обработки webhook)
  findOneByPaymentOrderDiadocDocumentId(documentId: string): Promise<IFormPayment | null>;

  // VF-2: Поиск FormPayment по Diadoc document ID для отчёта
  findOneByReportDiadocDocumentId(documentId: string): Promise<IFormPayment | null>;

  // VF-2: Установка способа подписи документов
  setSignMethod(
    findData: IFormPaymentQuery,
    signMethod: { paymentOrderSignMethod?: 'manual' | 'diadoc'; reportSignMethod?: 'manual' | 'diadoc' },
  ): Promise<IFormPayment>;
}

export interface IApplyPaymentPayload {
  formPaymentId: string;
  chargeType: PaymentChargeType;
  payDate: Date;
  totalAmount: number;
}

export interface IFormPaymentQuery extends IBaseQuery {
  search?: string;
  account?: string | Types.ObjectId | IAccount;
  provider?: string | IAccount;
  providers?: string[];
  agent?: string | IAgent;
  agents?: string[];
  status?: FormPaymentStatus;
  statuses?: FormPaymentStatus[];
  uid?: number;
  isOrderAccepted?: boolean;
  direction?: FormPaymentDirection;
  directions?: FormPaymentDirection[];
  manager?: string | IAccount;
  managers?: string[];
  totalsPaidDateLte?: Date;
  totalsIsEventSentExpiresPaidDate?: boolean;
  forImportByStatuses?: FormPaymentStatus[];
  forExportByStatuses?: FormPaymentStatus[];
  organization?: string;
  clientOrganizationName?: string;
  notInStatuses?: FormPaymentStatus[];
  organizationInn?: string;
  coverAmount?: number;
  feeAmount?: number;
  clientCurrency?: AllCurrencies;
  clientCurrencies?: AllCurrencies[];
  counterpartyCurrency?: AllCurrencies;
  counterpartyCurrencies?: AllCurrencies[];
  amountGte?: number;
  amountLte?: number;
  sentDateGte?: Date;
  sentDateLt?: Date;
  createDateGte?: Date;
  createDateLt?: Date;
  updateDateGte?: Date;
  updateDateLt?: Date;
  isImportant?: boolean;
  orderAcceptanceDateExists?: boolean;
  providerOrganization?: boolean | string | string[];
  organizationSubaccount?: string | Types.ObjectId;
  coverAmountExists?: boolean;
  amountExists?: boolean;
  stages?: FormPaymentStage[];
  isProviderCompletedPayment?: boolean;
  platformPaymentCondition?: FormPaymentCondition;
  platformPostpayMode?: PlatformPostpayMode;
  platformPostpayModes?: PlatformPostpayMode[];

  // Поля для функционала копирования заявок
  sourceFormId?: string;
  copyDateGte?: Date;
  copyDateLte?: Date;

  // Фильтр по заморозке экспортной сделки
  isFreeze?: boolean | { $ne: boolean };

  // Фильтр по доступности экспортной сделки
  isAvailable?: boolean | { $ne: boolean };
}

export interface IFormPaymentForLiquidityGlassQuery {
  direction: FormPaymentDirection;
}

export interface IFormPaymentAdminQuery extends IBaseQuery {
  account?: IAccount;
}

export interface IFormPaymentInvoiceOptional {
  file?: string;
}

export interface IFormPaymentCreate {
  status?: FormPaymentStatus;
  prevStatus?: FormPaymentStatus;
  account: string;
  contract?: string;
  invoices?: IFormPaymentInvoice[];
  platformPaymentCondition?: FormPaymentCondition;
  platformPostpayMode?: PlatformPostpayMode;
  linkedExportForms?: string[];
  direction?: FormPaymentDirection;
  isAvailable?: boolean;
  paymentMethod?: FormPaymentPaymentMethod;
}

export interface IFormUpdateByUser
  extends Partial<Pick<IFormPaymentBase, 'direction'>>,
    Partial<Pick<IFormPaymentTotals, 'amount'>> {
  counterparty?: Partial<IFormBankDetails>;
  counterpartyRef?: string;
  counterpartyBankUuid?: string;
  counterpartyAccountUuid?: string;
  intermediary?: Partial<IFormBankDetails>;
  status?: FormPaymentStatus;
  currencyClient?: AllCurrencies; // currency.recipient
  clientCryptoRequisites?: ICryptoRequisites;
  currencyCounterparty?: AllCurrencies; // currency.sender
  counterpartyCryptoRequisites?: ICryptoRequisites;
  organization?: string | IFormPaymentOrganization;
  preferedProvider?: string | IOrganization; // Preferred provider (organization) selected by client
  addAdditional?: string[];
  removeAdditional?: string[];
  counterpartyPaymentCondition?: FormPaymentCondition;
  platformPaymentCondition?: FormPaymentCondition;
  // Partial organization updates (special conditions only)
  organizationName?: string;
  organizationFullName?: string;
  organizationBusinessForm?: OrganizationBusinessFormType;
  organizationInn?: string;
  contract?: string | null;
  paymentMethod?: FormPaymentPaymentMethod;
}

export interface IFormUpdateOrderByUser {
  paymentOrderSigned: string;
  status: FormPaymentStatus;
}
export interface IFormUpdatePaymentsByUser {
  addPayments?: string[];
  removePayments?: string[];
  addTransactions?: IFormPaymentTransactionAdd[];
  removeTransaction?: IFormPaymentTransactionRemove;
  addAdditional?: string[];
  removeAdditional?: string[];
}

export interface IFormUpdateProviderOrganization {
  _id: string;
  requisiteId?: string;
}

export interface IFormUpdateByProvider
  extends IFormUpdatePaymentsByUser,
    Pick<IFormUpdate, 'updateProviderOrganization'> {}

export interface IFormUpdateReportByUser {
  reportSigned: string;
  status: FormPaymentStatus;
}

export interface IFormUpdateReportByAdmin {
  reportSigned: string;
}
export interface IFormUpdateClosingByUser {
  addClosing?: string[];
  removeClosing?: string[];
}

export interface IFormUpdateClientOrganizationByAdmin
  extends Partial<
    Pick<Organization, 'email' | 'inn' | 'name' | 'phone' | 'signerName' | 'signerPosition' | 'signerOtherPosition'>
  > {
  refOrganizationId?: string;
  isChanged?: boolean;
}

export interface IFormUpdate
  extends UpdatePartial<Omit<IFormPayment, 'organization' | 'contract'>>,
    Omit<IFormUpdateByUser, 'status' | 'organization' | 'organizationBusinessForm'> {
  addPayments?: string[];
  removePayments?: string[];
  addClosing?: string[];
  removeClosing?: string[];
  paymentOrder?: string;
  paymentOrderDocx?: string;
  paymentAdvanceOrder?: string;
  paymentAdvanceOrderDocx?: string;
  addRefundDocuments?: string[];
  removeRefundDocuments?: string[];
  paymentOrderSigned?: string;
  treasurerOrder?: string | null;
  treasurerOrderSigned?: string | null;
  exportRevenueConfirmation?: string | null;
  addTransactions?: IFormPaymentTransactionAdd[];
  removeTransactions?: IFormPaymentTransactionRemove[];
  addRefundTransactions?: IFormPaymentTransactionAdd[];
  removeRefundTransactions?: IFormPaymentTransactionRemove[];
  isImportant?: boolean;
  isOrderAccepted?: boolean;
  organization?: string | IFormUpdateClientOrganizationByAdmin;
  providerOrganization?: string | IFormPaymentOrganization;
  agentReportPdf?: string;
  agentReportDocx?: string;
  agentReportSigned?: string;
  report?: string;
  docxFile?: string;
  reportSigned?: string;
  addAdditional?: string[];
  removeAdditional?: string[];
  orderAcceptanceDate?: Date;
  addSwift?: string[];
  removeSwift?: string[];
  isOrganizationConfirmed?: boolean;
  organizationStatus?: OrganizationStatus;
  organizationPhone?: string;
  organizationEmail?: string;
  organizationSignerName?: string;
  organizationSignerPosition?: OrganizationSignerPositionType;
  organizationName?: string;
  organizationInn?: string;
  organizationOgrn?: string;
  organizationKpp?: string;
  organizationLegalAddress?: string;
  organizationFullName?: string;
  organizationBusinessForm?: string | OrganizationBusinessFormType;
  updateProviderOrganization?: IFormUpdateProviderOrganization;
  totalsFeeAmount?: number;
  totalsCoverAmount?: number;
  currencyRate?: number;
  clearRates?: boolean;
  /**
   * Internal-only option for clearing pricing fields.
   * - 'all' clears deal rate, fixed-fee rate, and fee terms
   * - 'ratesOnly' clears only rates/derived totals (keeps feePercent/feeFix/fixFeeCurrency)
   */
  clearRatesMode?: 'all' | 'ratesOnly';
  stage?: FormPaymentStage;
  isPaymentCancel?: boolean;
  feePaid?: boolean;
  // Спец-флаг: менеджер явно возвращает заявку
  // из MANAGER_CHECKING обратно в PAYMENT_SENT
  // (чтобы отличать от обычных переходов и ужесточить граф).
  isManagerReturnToPaymentSent?: boolean;

  // Поля для функционала копирования заявок
  sourceFormId?: string;
  copyDate?: Date;

  // Поле для редактирования complianceReport
  complianceReport?: {
    text?: string;
    status?: string;
    error?: {
      message: string;
      statusCode?: number;
      timestamp: Date;
      attempts: number;
    };
    createdDate?: Date;
    updatedDate?: Date;
    requestCount?: number; // Количество запросов к ChatGPT (максимум 5)
  };

  // Привязка экспортных сделок (только для импортных сделок)
  linkedExportForms?: string[];
}

export interface IFormPaymentUserValidate {
  status: FormPaymentStatusUpdateByUser;
  direction: FormPaymentDirection;
  currency: IFormPaymentCurrency;
  totals: IFormPaymentTotals;
  invoice: IFormPaymentInvoice;
  counterparty: IFormBankDetails;
  intermediary: IFormBankDetails;
}

export interface checkTransitStatus {
  startStatus: FormPaymentStatus;
  endStatus: FormPaymentStatus;
  direction: FormPaymentDirection;
  platformPostpayMode?: PlatformPostpayMode;
  isCorporateClient?: boolean;
}

export interface IFormUpdateAdditionalByUser {
  addAdditional?: string[];
  removeAdditional?: string[];
}

export interface IFormSyncOrganizationSubaccountsRpc {
  account: string;
  organizationId: string;
  subaccounts: Pick<IOrganizationSubaccount, 'account' | 'name'>[];
}

export interface IFormUpdateWithPlatformPaymentConditionAndDirection
  extends Pick<IFormUpdate, 'platformPaymentCondition' | 'platformPostpayMode' | 'direction'> {}

export interface IFormPaymentForXlsx extends IFormPayment {
  payments: IPayment[];
}

// Интерфейс для создания копии заявки с полями копирования
export interface IFormPaymentCreateCopy extends IFormPaymentCreate {
  sourceFormId?: string; // ID исходной заявки, из которой скопировали
  copyDate?: Date; // Дата копирования
  direction?: FormPaymentDirection; // Направление сделки
  currency?: IFormPaymentCurrency; // Валюта
  counterparty?: Partial<IFormBankDetails>; // Контрагент
  intermediary?: Partial<IFormBankDetails>; // Посредник
  invoices?: IFormPaymentInvoice[]; // Инвойсы
  organization?: string | IFormPaymentOrganization; // Организация
  totals?: IFormPaymentTotals; // Суммы
  provider?: string | IAccount; // Провайдер
  preferedProvider?: string | IOrganization; // Предпочтительный провайдер клиента
  agent?: string | IAgent; // Агент
  agentRequisites?: IRequisites[]; // Реквизиты агента
  clientOrganization?: string; // Организация клиента
  organizationName?: string; // Название организации
  signer?: string; // Подписант
  manager?: string | IAccount; // Менеджер
}
