import { IAccount } from 'lib/interfaces/models/account.interface';
import { ISchema } from 'lib/interfaces/schema.interface';
import { ITreasurerTask } from 'lib/interfaces/models/treasurer-task.interface';
import {
  FormPaymentStatus,
  FormPaymentDirection,
  FormPaymentKind,
  FormPaymentCondition,
  FormPaymentStage,
  PlatformPostpayMode,
  FormPaymentPaymentMethod,
} from '../../enums/models/form-payment.enums';
import { AllCurrencies } from '../../enums/common.enums';
import { IFile } from './file.interface';
import { IAgent } from './agent.interface';
import { IContract } from './contract.interface';
import { ICryptoRequisites } from '../crypto-requisites.interface';
import { IRequisites } from '../bank-requisites.interface';
import { IOrganization } from './organization.interface';
import { IHsCodeSnapshot } from './hs-code.interface';
import { CounterpartyApprovalStatus } from '../../enums/models/counterparty.enums';
import { RateValueSource } from '../../enums/models/currency.enums';

export interface IFormPaymentOrganization extends Omit<IOrganization, 'requisites'> {
  requisite?: IRequisites;
  hsCodePrefixes?: string[];
  hsCodes?: string[];
  refOrganizationId?: string;
  isChanged: boolean;
}

export interface IFormPaymentBase {
  account: string | IAccount;
  status: FormPaymentStatus;
  prevStatus: FormPaymentStatus;
  stage: FormPaymentStage;
  direction?: FormPaymentDirection;
  currency?: IFormPaymentCurrency;

  totals?: IFormPaymentTotals;

  docs?: IFormPaymentDocs;
  contract?: string | IFile; // файл контракта по заявке
  importFile?: string | IFile;
  transactions?: IFormPaymentTransaction[];
  refundTransactions?: IFormPaymentTransaction[];

  platformPaymentCondition?: FormPaymentCondition; // условия оплаты с платформой
  platformPostpayMode?: PlatformPostpayMode; // postpay scenario (rate-on-provider / fixed-rate / legacy)
  counterpartyPaymentCondition?: FormPaymentCondition; // условия оплаты с контрагентом
  paymentAgencyFeeCondition?: FormPaymentCondition; // условия оплаты комиссии если direction=export, только partPostPayment

  invoices?: IFormPaymentInvoice[];

  paymentRecognized?: IFormPaymentRecognized;

  // контрагент
  counterparty?: Partial<IFormBankDetails>;

  // Counterparty registry references
  counterpartyRef?: string; // Reference to Counterparty._id
  counterpartyBankUuid?: string; // UUID of selected bank
  counterpartyAccountUuid?: string; // UUID of selected account

  // посредник
  intermediary?: Partial<IFormBankDetails>;

  provider?: string | IAccount;
  preferedProvider?: string | IOrganization;
  agent?: string | IAgent;
  agentRequisites?: IRequisites[];

  organization?: string | IFormPaymentOrganization; // организация клиента
  clientOrganization?: string; // старое поле организации
  organizationName?: string; // старое поле организации
  signer?: string;

  uid?: number;

  sentDate?: Date;

  signingOrderCreateDate?: Date; // Дата поручения принципала (сгенерированного или загруженного)
  advanceSigningOrderCreateDate?: Date; // Дата дополнительного поручения принципала (сгенерированного или загруженного)

  rejectText?: string | null;

  // Контракты клиента с агентом в статусе rejected
  rejectedAgentContracts?: IContract[];

  providerOrganization?: string | IFormPaymentOrganization;

  manager?: string | IAccount;

  moveToProviderDate?: Date;
  paymentByProviderDate?: Date;

  isSigningOrderSent?: boolean;
  isOrderAccepted?: boolean;
  orderAcceptanceDate?: Date;

  // дата поступления покрытия (менеджер)
  dateReceiptOfCover?: Date;
  // дата поступления комиссии (менеджера)
  dateReceiptOfCommission?: Date;

  // Поля для функционала копирования заявок
  sourceFormId?: string; // ID исходной заявки, из которой скопировали
  copyDate?: Date; // Дата копирования

  // Поле для ответа ChatGPT с анализом контрагента
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

  /**
   * Как были зафиксированы курс и комиссия:
   * - auto_default: старый автоподсчёт без правил аккаунта
   * - auto_account_rules: calculation by account rules
   * - manual: менеджер задал вручную
   */
  pricingMode?: 'auto_default' | 'auto_account_rules' | 'manual';

  /**
   * Когда курс/комиссия были зафиксированы (любым способом)
   */
  pricingFixedAt?: Date;
  // Привязанные экспортные сделки (только для импортных сделок)
  linkedExportForms?: (string | IFormPayment)[];

  // Флаг заморозки экспортной сделки (устанавливается при привязке к импортной)
  isFreeze?: boolean;

  // Флаг доступности экспортной сделки (false когда импортная сделка перешла в SIGNING_ORDER_ACCEPTED)
  isAvailable?: boolean;

  // ID задачи казначея (для выплаты остатка по экспортной сделке)
  task?: string | ITreasurerTask;

  // Сумма долга для возврата по экспортной сделке (в валюте контрагента импортной сделки)
  debtAmount?: number;

  // Сумма привязанных экспортных сделок в валюте контрагента импортной сделки
  linkedExportFormsTotalAmount?: number;

  // Статус переплаты: overpayment_export если сумма экспортных больше импортной, overpayment_import если импортная больше или равна экспортной
  overpaymentStatus?: FormPaymentStatus;

  paymentMethod?: FormPaymentPaymentMethod;
}

export interface IFormPaymentTransaction {
  account: string | IAccount;
  uuid: string;
  hash: string;
  chain: string;
}

export interface IFormPaymentTransactionAdd extends Pick<IFormPaymentTransaction, 'hash' | 'chain'> {}
export interface IFormPaymentTransactionRemove extends Pick<IFormPaymentTransaction, 'uuid'> {
  account?: string | IAccount;
}

export interface IFormPaymentTotals {
  // храним в сотнях (*100)
  amount: number; // сумма платежа получателю (бенефициар)
  coverAmount?: number; // сумма покрытия (amount конвертированный в валюта клиента)
  feeAmount?: number; // сумма комиссии
  feePercent?: number; // процент комиссии
  feeFix?: number; // фиксированная комиссии
  feeFixCover?: number; // фиксированная комиссии в валюте клиента
  feePaid?: boolean;
  paidDate?: Date; // дата проведения платежа
  isEventSentExpiresPaidDate?: boolean; // признак отправки сообщения по истечению даты платежа
  differenceAmount?: number; // разница между totals.amount и linkedExportFormsTotalAmount (в валюте контрагента)
  feeAmountInCounterpartyCurrency?: number; // feeAmount пересчитанный в валюту контрагента по currency.rate
  differenceAmountClientCur?: number; // differenceAmount конвертированный в валюту клиента (differenceAmount * currency.rate)
}

export interface IFormPaymentDocs {
  // агентский договор хранится отдельно в бд аккаунта либо коллекции договоров

  // поручение принципала
  paymentOrder?: string | IFile; // поручение принципала PDF
  paymentOrderDocx?: string | IFile; // поручение принципала DOCX
  paymentAdvanceOrder?: string | IFile; // доп поручение принципала PDF
  paymentAdvanceOrderDocx?: string | IFile; // доп поручение принципала DOCX
  paymentOrderSigned?: string[] | IFile[]; // подписанное поручение принципала

  // поручение казначея
  treasurerOrder?: string | IFile; // сгенерированное платежное поручение казначея
  treasurerOrderSigned?: string | IFile; // подписанное платежное поручение казначея
  exportRevenueConfirmation?: string | IFile; // подтверждение выплаты по экспортной выручке

  // отчет ОА
  report?: string | IFile; // отчет подписанный агентом (PDF)
  docxFile?: string | IFile; // отчет подписанный агентом (DOCX)
  reportSigned?: string | IFile; // отчет подписанный клиентом

  payments?: string[] | IFile[]; // платежи

  // доки об отгрузке товаров/услуг и любые другие заркывающие доки
  closing?: string[] | IFile[]; // обязательно нужно приложить в конце если direction=import и обязательно вначале при export

  archive?: string | IFile;

  refund?: string[] | IFile[]; // подтверждение возврата средств

  additional?: string[] | IFile[]; // дополнительные документы

  swift?: string[] | IFile[]; // SWIFT документы загружаемые провайдером

  // VF-2: Поля для интеграции с Diadoc - поручение на оплату
  paymentOrderDiadocDocumentId?: string;
  paymentOrderDiadocMessageId?: string;

  // VF-2: Поля для интеграции с Diadoc - отчёт
  reportDiadocDocumentId?: string;
  reportDiadocMessageId?: string;

  // VF-2 FIX: Способ подписи документов
  paymentOrderSignMethod?: 'manual' | 'diadoc';
  reportSignMethod?: 'manual' | 'diadoc';

  // VF-2 FIX: Флаги и даты для статуса "На подписании в ЭДО"
  paymentOrderIsDiadocSigning?: boolean;
  paymentOrderDiadocSentAt?: Date;
  reportIsDiadocSigning?: boolean;
  reportDiadocSentAt?: Date;
}

export interface IFormRecognized {
  counterparty?: Partial<IFormBankDetails>;
  hsCodes?: string[];
  kind?: FormPaymentKind;
}

export interface IFormPaymentInvoice {
  uuid?: string;

  file?: string | IFile; // файл инвойса
  contract?: string | IFile; // legacy contract attached to invoice (backward compatibility)
  recognizeLines?: string[]; // распознование инвойса
  recognized?: IFormRecognized; // распознование инвойса
  contractNumber?: string;
  contractDate?: Date;
  invoiceNumber?: string;
  invoiceDate?: Date;
  deadlineShipment?: Date; // обязательно если paymentCondition=advance

  kind?: FormPaymentKind; // товар/услуга
  hsCode?: string; // обязательно, если kind=good
  hsCodes?: IHsCodeSnapshot[];
}

export interface IFormPaymentRecognized {
  paymentNumber?: string;
  paymentDate?: Date;
}

// банковские реквезиты
export interface IFormBankDetails {
  // реквезиты банка получателя
  swiftCode: string; // swift code банка
  bankName: string; // Наименование банка контрагента
  bankCountry: string; // Наименование банка контрагента
  bankAddress: string; // Наименование банка контрагента
  accountNumber: string; // Номер счета контрагента
  bankCode?: string;

  // реквезиты получателя
  name: string; // Наименование компании контрагента
  address: string; // Адрес компании контрагента
  legalAddress?: string; // Юридический адрес контрагента
  beneficiaryWebsite?: string;
  country?: string; // страна получателя
  lastApprovalStatus?: CounterpartyApprovalStatus | null; // Статус одобрения контрагента из реестра
}

export interface IFormPaymentCurrency {
  client: AllCurrencies;
  clientCryptoRequisites?: ICryptoRequisites;
  counterparty: AllCurrencies;
  counterpartyCryptoRequisites?: ICryptoRequisites;
  base?: AllCurrencies;
  rate?: number;
  rateSource?: RateValueSource; // источник курса сделки
  fixFeeRate?: number; // курс фиксированной комиссии
  fixFeeRateSource?: RateValueSource; // источник курса фиксированной комиссии
  fixFeeCurrency?: AllCurrencies; // валюта фиксированной комиссии
}

export interface IFormPayment extends ISchema, IFormPaymentBase {}

export interface IFormPaymentByOrderAccepted {
  _id: string;
  country: string;
  amount: number;
  currency: AllCurrencies;
  sentDate: Date;
}

// currency.fixFeeRate?: number; // курс фиксированной комиссии
// currency.fixFeeCurrency?: AllCurrencies; // валюта фиксированной комиссии
// totals.feeFix?: number; сумма фиксированная комиссии
