import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { IFile } from 'lib/interfaces/models/file.interface';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import { BaseSchema } from 'lib/services/base/base.schema';
import {
  IFormBankDetails,
  IFormPayment,
  IFormPaymentCurrency,
  IFormPaymentDocs,
  IFormPaymentInvoice,
  IFormPaymentOrganization,
  IFormPaymentRecognized,
  IFormPaymentTotals,
  IFormPaymentTransaction,
  IFormRecognized,
} from 'lib/interfaces/models/form-payment.interface';
import { numberFloorPropOptions } from 'lib/utils/helpers/prop.helpers';
import {
  FormPaymentCondition,
  FormPaymentDirection,
  FormPaymentKind,
  FormPaymentStage,
  FormPaymentStatus,
  PlatformPostpayMode,
  FormPaymentPaymentMethod,
} from 'lib/enums/models/form-payment.enums';
import { AllCurrencies } from 'lib/enums/common.enums';
import { RateValueSource } from 'lib/enums/models/currency.enums';
import { IAgent } from '../../../lib/interfaces/models/agent.interface';
import { Requisites } from '../../agent/service/agent.schema';
import { ICryptoRequisites } from 'lib/interfaces/crypto-requisites.interface';
import {
  OrganizationBusinessFormType,
  OrganizationSignerPositionType,
  OrganizationStatus,
  OrganizationType,
} from 'lib/enums/models/organization.enums';
import { IOrganizationRequisites } from 'lib/interfaces/models/organization.interface';
import { RequisitesSchema } from '../../organization/service/organization.schema';
import { HsCodeLoyalty } from 'lib/enums/models/hs-code.enums';
import { IHsCodeSnapshot } from 'lib/interfaces/models/hs-code.interface';

@Schema({ _id: false })
export class Transactions implements IFormPaymentTransaction {
  @Prop({ type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Account' })
  account: IAccount | string;

  @Prop({ required: true, index: true })
  uuid: string;

  @Prop({ required: true })
  hash: string;

  @Prop({ required: true })
  chain: string;
}

export const TransactionsSchema = SchemaFactory.createForClass(Transactions);

@Schema({ _id: false })
export class FormPaymentOrganizationRequisite implements IOrganizationRequisites {
  @Prop({ required: true })
  uuid: string;

  @Prop({ required: true })
  bankName: string;

  @Prop({ required: true })
  accountNumber: string;

  @Prop({ required: false })
  swiftCode?: string;

  @Prop({ required: false })
  bankCountry?: string;

  @Prop({ required: false })
  bankAddress?: string;

  @Prop({ required: false })
  bik?: string;

  @Prop({ required: false })
  corrNumber?: string;
}

export const FormPaymentOrganizationRequisiteSchema = SchemaFactory.createForClass(FormPaymentOrganizationRequisite);

export class FormPaymentOrganization extends BaseSchema implements IFormPaymentOrganization {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  inn?: string;

  @Prop({ required: false })
  ogrn?: string;

  @Prop({ required: false })
  kpp?: string;

  @Prop({ required: false })
  legalAddress?: string;

  @Prop({ required: false })
  fullName?: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  signerName: string;

  @Prop({ enum: OrganizationSignerPositionType, required: true })
  signerPosition: OrganizationSignerPositionType;

  @Prop({ required: false })
  signerOtherPosition?: string;

  @Prop({ enum: OrganizationType, required: true, default: OrganizationType.USER })
  type: OrganizationType;

  @Prop({ enum: OrganizationBusinessFormType, required: true })
  businessForm: OrganizationBusinessFormType;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  organizationCard?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Account' })
  account?: string | IAccount;

  @Prop({ default: OrganizationStatus.NOT_APPROVED, required: true, enum: OrganizationStatus })
  status: OrganizationStatus;

  @Prop({ required: false })
  approvedAt?: Date;

  @Prop({ required: false })
  isDeleted?: boolean;

  @Prop({ required: false, type: [FormPaymentOrganizationRequisiteSchema] })
  requisite?: IOrganizationRequisites;

  @Prop({ type: [String], default: [] })
  hsCodePrefixes?: string[];

  @Prop({ type: [String], default: [] })
  hsCodes?: string[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Organization', index: true })
  refOrganizationId?: string;

  @Prop({ default: false, required: true })
  isChanged: boolean;
}

export const FormPaymentOrganizationSchema = SchemaFactory.createForClass(FormPaymentOrganization);

@Schema({ _id: false })
export class PaymentOrderGenerationStatus {
  @Prop({ type: String, enum: ['pending', 'success', 'failed'] })
  status: 'pending' | 'success' | 'failed';

  @Prop({ type: Number, default: 0 })
  attempts: number;

  @Prop({ type: Date })
  lastAttemptAt: Date;

  @Prop({ type: String })
  lastError?: string;

  @Prop({ type: String })
  lockOwner?: string;

  @Prop({ type: Date })
  lockedAt?: Date;
}

export const PaymentOrderGenerationStatusSchema = SchemaFactory.createForClass(PaymentOrderGenerationStatus);

@Schema({ _id: false })
export class DocsForm implements IFormPaymentDocs {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  paymentOrder?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  paymentOrderDocx?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  paymentAdvanceOrder?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  paymentAdvanceOrderDocx?: string;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], unique: false, required: false, ref: 'File' })
  paymentOrderSigned?: string[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  treasurerOrder?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  treasurerOrderSigned?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  exportRevenueConfirmation?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  report?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  docxFile?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  reportSigned?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  archive?: string;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], unique: false, required: false, ref: 'File' })
  payments?: string[];

  @Prop({ type: [mongoose.Schema.Types.ObjectId], unique: false, required: false, ref: 'File' })
  closing?: string[];

  @Prop({ type: [mongoose.Schema.Types.ObjectId], unique: false, required: false, ref: 'File' })
  refund?: string[];

  @Prop({ type: [mongoose.Schema.Types.ObjectId], unique: false, required: false, ref: 'File' })
  additional?: string[];

  @Prop({ type: [mongoose.Schema.Types.ObjectId], unique: false, required: false, ref: 'File' })
  swift?: string[];

  // VF-2: Поля для интеграции с Diadoc - поручение на оплату
  @Prop({ required: false })
  paymentOrderDiadocDocumentId?: string;

  @Prop({ required: false })
  paymentOrderDiadocMessageId?: string;

  // VF-2: Поля для интеграции с Diadoc - отчёт
  @Prop({ required: false })
  reportDiadocDocumentId?: string;

  @Prop({ required: false })
  reportDiadocMessageId?: string;

  // VF-2 FIX: Способ подписи документа поручения
  @Prop({ required: false, enum: ['manual', 'diadoc'], default: 'manual' })
  paymentOrderSignMethod?: 'manual' | 'diadoc';

  // VF-2 FIX: Способ подписи отчёта
  @Prop({ required: false, enum: ['manual', 'diadoc'], default: 'manual' })
  reportSignMethod?: 'manual' | 'diadoc';

  // VF-2 FIX: Флаг - документ на подписании в ЭДО (поручение)
  @Prop({ required: false, default: false })
  paymentOrderIsDiadocSigning?: boolean;

  // VF-2 FIX: Дата отправки поручения в Diadoc (для 3-дневного уведомления)
  @Prop({ required: false })
  paymentOrderDiadocSentAt?: Date;

  // VF-2 FIX: Флаг - документ на подписании в ЭДО (отчёт)
  @Prop({ required: false, default: false })
  reportIsDiadocSigning?: boolean;

  // VF-2 FIX: Дата отправки отчёта в Diadoc (для 3-дневного уведомления)
  @Prop({ required: false })
  reportDiadocSentAt?: Date;
}

export const DocsFormSchema = SchemaFactory.createForClass(DocsForm);

@Schema({ _id: false })
export class TotalsForm implements IFormPaymentTotals {
  @Prop({ required: true, ...numberFloorPropOptions })
  amount: number;

  @Prop({ required: false, ...numberFloorPropOptions })
  coverAmount?: number; // сумма покрытия

  @Prop({ required: false, ...numberFloorPropOptions })
  feePercent?: number; // процент комиссии

  @Prop({ required: false, ...numberFloorPropOptions })
  feeAmount?: number; // сумма покрытия

  @Prop({ required: false, ...numberFloorPropOptions })
  feeFixCover?: number; // фиксированная сумма комиссии в валюте клиента

  @Prop({ required: false, ...numberFloorPropOptions })
  feeFix?: number; // фиксированная сумма комиссии

  @Prop({ required: false })
  feePaid?: boolean;

  @Prop({ required: false })
  paidDate?: Date; // Дата проведения платежа

  @Prop({ required: false })
  isEventSentExpiresPaidDate?: boolean; // признак отправки сообщения по истечению даты платежа

  @Prop({ required: false, ...numberFloorPropOptions })
  differenceAmount?: number; // разница между totals.amount и linkedExportFormsTotalAmount (в валюте контрагента)

  @Prop({ required: false, ...numberFloorPropOptions })
  feeAmountInCounterpartyCurrency?: number; // feeAmount пересчитанный в валюту контрагента по currency.rate

  @Prop({ required: false, ...numberFloorPropOptions })
  differenceAmountClientCur?: number; // differenceAmount конвертированный в валюту клиента (differenceAmount * currency.rate)
}

export const TotalsFormSchema = SchemaFactory.createForClass(TotalsForm);

@Schema({ _id: false })
export class CryptoRequisitesForm implements ICryptoRequisites {
  @Prop({ required: true })
  chain: string;

  @Prop({ required: true })
  address: string;
}

export const CryptoRequisitesFormSchema = SchemaFactory.createForClass(CryptoRequisitesForm);

@Schema({ _id: false })
export class CurrencyForm implements IFormPaymentCurrency {
  @Prop({ enum: AllCurrencies, required: true, index: true })
  client: AllCurrencies;

  @Prop({ type: CryptoRequisitesFormSchema, required: false })
  clientCryptoRequisites?: CryptoRequisitesForm;

  @Prop({ enum: AllCurrencies, required: false, index: true, sparse: true })
  fixFeeCurrency?: AllCurrencies;

  @Prop({ enum: AllCurrencies, required: true, index: true })
  counterparty: AllCurrencies;

  @Prop({ type: CryptoRequisitesFormSchema, required: false })
  counterpartyCryptoRequisites?: CryptoRequisitesForm;

  @Prop({ enum: AllCurrencies, required: false })
  base?: AllCurrencies;

  @Prop({ required: false })
  rate?: number;

  @Prop({ required: false, enum: RateValueSource })
  rateSource?: RateValueSource;

  @Prop({ required: false })
  fixFeeRate?: number;

  @Prop({ required: false, enum: RateValueSource })
  fixFeeRateSource?: RateValueSource;
}

export const CurrencyFormSchema = SchemaFactory.createForClass(CurrencyForm);

@Schema({ _id: false })
export class FormBankDetails implements IFormBankDetails {
  @Prop({ required: false, sparse: true, index: true })
  swiftCode: string; // swift code банка

  @Prop({ required: false })
  bankName: string; // Наименование банка контрагента

  @Prop({ required: false, sparse: true, index: true })
  bankCountry: string; // страна банка

  @Prop({ required: false, sparse: true, index: true })
  bankAddress: string; // адресс банка

  @Prop({ required: false, sparse: true, index: true })
  bankCode?: string;

  @Prop({ required: false })
  name: string; // Наименование компании контрагента

  @Prop({ required: false })
  address: string; // Адрес компании контрагента

  @Prop({ required: false })
  legalAddress?: string; // Юридический адрес компании

  @Prop({ required: false, sparse: true, index: true })
  accountNumber: string; // Номер счета контрагента

  @Prop({ required: false })
  beneficiaryWebsite?: string;

  @Prop({ required: false })
  country?: string;
}

export const FormBankDetailsSchema = SchemaFactory.createForClass(FormBankDetails);

@Schema({ _id: false })
export class Recognized implements IFormRecognized {
  @Prop({ type: FormBankDetailsSchema, required: false })
  counterparty?: FormBankDetails;

  @Prop({ type: [String], required: false })
  hsCodes?: string[];

  @Prop({ type: String, enum: FormPaymentKind, required: false })
  kind?: FormPaymentKind;
}

export const RecognizedSchema = SchemaFactory.createForClass(Recognized);
RecognizedSchema.set('minimize', false);

@Schema({ _id: false })
export class HsCodeSnapshot implements IHsCodeSnapshot {
  @Prop({ required: true, index: true })
  code: string;

  @Prop()
  description?: string;

  @Prop()
  chapter?: string;

  @Prop()
  section?: string;

  @Prop()
  type?: string;

  @Prop({ enum: HsCodeLoyalty })
  loyalty?: HsCodeLoyalty;

  @Prop()
  comment?: string;

  @Prop({ required: true, default: false })
  isManual: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const HsCodeSnapshotSchema = SchemaFactory.createForClass(HsCodeSnapshot);

@Schema({ _id: false })
export class FormInvoice implements IFormPaymentInvoice {
  @Prop({ required: false, index: true, sparse: true })
  uuid?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  file?: string;

  @Prop({ required: false })
  recognizeLines?: string[];

  @Prop({ type: RecognizedSchema, required: false })
  recognized?: Recognized;

  @Prop({ required: false, index: true, sparse: true })
  contractNumber?: string;

  @Prop({ required: false, index: true, sparse: true })
  contractDate?: Date;

  @Prop({ required: false, index: true, sparse: true })
  invoiceNumber?: string;

  @Prop({ required: false, index: true, sparse: true })
  invoiceDate?: Date;

  @Prop({ required: false, index: true, sparse: true })
  deadlineShipment?: Date;

  @Prop({ type: String, enum: FormPaymentKind, required: false, index: true, sparse: true })
  kind?: FormPaymentKind; // товар/услуга

  @Prop({ required: false, index: true, sparse: true })
  hsCode?: string; // обязательно, если kind=good

  @Prop({ type: [HsCodeSnapshotSchema], default: [] })
  hsCodes?: HsCodeSnapshot[];
}

export const FormInvoiceSchema = SchemaFactory.createForClass(FormInvoice);
FormInvoiceSchema.set('minimize', false);

@Schema({ _id: false })
export class FormPaymentRecognized implements IFormPaymentRecognized {
  @Prop({ required: false })
  paymentNumber?: string;

  @Prop({ required: false })
  paymentDate?: Date;
}

export const FormPaymentRecognizedSchema = SchemaFactory.createForClass(FormPaymentRecognized);

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'form-payments',
})
export class FormPayment extends BaseSchema implements IFormPayment {
  @Prop({ index: true })
  uid: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Account' })
  account: IAccount | string;

  @Prop({ enum: FormPaymentStatus, required: true, default: FormPaymentStatus.CREATING })
  status: FormPaymentStatus;

  @Prop({ enum: FormPaymentStatus, required: true, default: FormPaymentStatus.CREATING })
  prevStatus: FormPaymentStatus;

  @Prop({ enum: FormPaymentStage, required: true, default: FormPaymentStage.NEW })
  stage: FormPaymentStage;

  @Prop({ enum: FormPaymentDirection, required: false, index: true, sparse: true })
  direction?: FormPaymentDirection;

  @Prop({ type: CurrencyFormSchema, required: false })
  currency?: CurrencyForm;

  @Prop({ type: TotalsFormSchema, required: false })
  totals?: TotalsForm;

  @Prop({ type: String, enum: ['auto_default', 'auto_account_rules', 'manual'], required: false })
  pricingMode?: 'auto_default' | 'auto_account_rules' | 'manual';

  @Prop({ type: Date, required: false })
  pricingFixedAt?: Date;

  @Prop({ type: DocsFormSchema, required: false })
  docs?: DocsForm;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  contract?: IFile | string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'File', required: false })
  importFile?: IFile | string;

  @Prop({ type: [TransactionsSchema], required: false })
  transactions?: Transactions[];

  @Prop({ type: [TransactionsSchema], required: false })
  refundTransactions?: Transactions[];

  @Prop({ enum: FormPaymentCondition, required: false, index: true, sparse: true })
  counterpartyPaymentCondition?: FormPaymentCondition;

  @Prop({ enum: FormPaymentCondition, required: false, index: true, sparse: true })
  platformPaymentCondition?: FormPaymentCondition;

  @Prop({ enum: PlatformPostpayMode, required: false, index: true, sparse: true })
  platformPostpayMode?: PlatformPostpayMode;

  @Prop({ enum: FormPaymentCondition, required: false })
  paymentAgencyFeeCondition?: FormPaymentCondition;

  @Prop({ type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Account' })
  provider: IAccount | string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, index: true, sparse: true, ref: 'Organization' })
  preferedProvider?: string | IOrganization;

  @Prop({ type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Agent' })
  agent?: IAgent | string;

  @Prop({ required: false, type: [RequisitesSchema] })
  agentRequisites?: Requisites[];

  @Prop({ type: FormBankDetailsSchema, required: false })
  counterparty?: FormBankDetails;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, index: true, sparse: true, ref: 'Counterparty' })
  counterpartyRef?: string;

  @Prop({ required: false, index: true, sparse: true })
  counterpartyBankUuid?: string;

  @Prop({ required: false, index: true, sparse: true })
  counterpartyAccountUuid?: string;

  @Prop({ type: FormBankDetailsSchema, required: false })
  intermediary?: FormBankDetails;

  @Prop({ required: false, type: [FormInvoiceSchema] })
  invoices?: FormInvoice[];

  @Prop({ type: FormPaymentRecognizedSchema, required: false })
  paymentRecognized: FormPaymentRecognized;

  @Prop({ required: false })
  rejectText?: string | null;

  @Prop({ required: false })
  organization?: FormPaymentOrganization;

  @Prop({ required: false })
  clientOrganization?: string;

  @Prop({ required: false })
  organizationName?: string;

  @Prop({ required: false })
  signer?: string;

  @Prop({ required: false, index: true, sparse: true })
  sentDate?: Date;

  @Prop({ required: false, index: true, sparse: true })
  signingOrderCreateDate?: Date;

  @Prop({ required: false, index: true, sparse: true })
  advanceSigningOrderCreateDate?: Date;

  @Prop({ required: false })
  isImportant?: boolean;

  @Prop({ required: false })
  isSigningOrderSent?: boolean;

  @Prop({ required: false })
  isOrderAccepted?: boolean;

  @Prop({ required: false })
  orderAcceptanceDate?: Date;

  @Prop({ required: false })
  providerOrganization?: FormPaymentOrganization;

  @Prop({ required: false })
  moveToProviderDate?: Date; // Дата перехода заявки на исполнение провайдеру

  @Prop({ required: false })
  paymentByProviderDate?: Date; // Дата проведения платежа провайдером

  @Prop({ required: false })
  dateReceiptOfCover?: Date;

  @Prop({ required: false })
  dateReceiptOfCommission?: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, index: true, sparse: true, ref: 'Account' })
  manager?: IAccount | string;

  // Поля для функционала копирования заявок
  @Prop({ required: false, index: true, sparse: true })
  sourceFormId?: string; // ID исходной заявки, из которой скопировали

  @Prop({ required: false, index: true, sparse: true })
  copyDate?: Date; // Дата копирования

  // Поле для ответа ChatGPT с анализом контрагента
  @Prop({ required: false, type: Object })
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

  // Payment order generation status and retry tracking
  @Prop({ type: PaymentOrderGenerationStatusSchema, required: false })
  paymentOrderGeneration?: PaymentOrderGenerationStatus;
  // Привязанные экспортные сделки (только для импортных сделок)
  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FormPayment' }],
    required: false,
    index: true,
    sparse: true,
  })
  linkedExportForms?: (string | IFormPayment)[];

  // Флаг заморозки экспортной сделки (устанавливается при привязке к импортной)
  @Prop({ type: Boolean, required: false, default: false })
  isFreeze?: boolean;

  // Флаг доступности экспортной сделки (false когда импортная сделка перешла в SIGNING_ORDER_ACCEPTED)
  @Prop({ type: Boolean, required: false, default: true })
  isAvailable?: boolean;

  // ID задачи казначея (для выплаты остатка по экспортной сделке)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    index: true,
    ref: 'TreasurerTask',
  })
  task?: string;

  // Сумма долга для возврата по экспортной сделке (в рублях)
  @Prop({ type: Number, required: false })
  debtAmount?: number;

  // Сумма привязанных экспортных сделок в валюте контрагента импортной сделки
  @Prop({ type: Number, required: false })
  linkedExportFormsTotalAmount?: number;

  // Статус переплаты: overpayment_export если сумма экспортных больше импортной, overpayment_import если импортная больше или равна экспортной
  @Prop({ enum: FormPaymentStatus, required: false, index: true, sparse: true })
  overpaymentStatus?: FormPaymentStatus;

  @Prop({ enum: FormPaymentPaymentMethod, required: false, index: true, sparse: true })
  paymentMethod?: FormPaymentPaymentMethod;
}

export const FormPaymentSchema = SchemaFactory.createForClass(FormPayment);

FormPaymentSchema.index({ 'organization.refOrganizationId': 1 });
FormPaymentSchema.index({ status: 1, platformPaymentCondition: 1, platformPostpayMode: 1 });

FormPaymentSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'entity',
  justOne: false,
});
