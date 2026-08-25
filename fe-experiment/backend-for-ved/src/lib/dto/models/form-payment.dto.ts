import { BaseDto } from '../base.dto';

import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, IntersectionType, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import {
  IFormBankDetails,
  IFormPayment,
  IFormPaymentBase,
  IFormPaymentByOrderAccepted,
  IFormPaymentCurrency,
  IFormPaymentDocs,
  IFormPaymentInvoice,
  IFormPaymentTotals,
  IFormPaymentTransaction,
  IFormPaymentTransactionAdd,
  IFormPaymentTransactionRemove,
  IFormRecognized,
} from '../../interfaces/models/form-payment.interface';
import { IAccount } from '../../interfaces/models/account.interface';
import {
  ChatGptStatus,
  FormPaymentCondition,
  FormPaymentDirection,
  FormPaymentKind,
  FormPaymentStage,
  FormPaymentStatus,
  PlatformPostpayMode,
  FormPaymentPaymentMethod,
} from '../../enums/models/form-payment.enums';
import { AllCurrencies } from '../../enums/common.enums';
import { IFile } from '../../interfaces/models/file.interface';
import { IAgent } from '../../interfaces/models/agent.interface';
import { ITreasurerTask } from '../../interfaces/models/treasurer-task.interface';
import { AgentDto } from './agent.dto';
import { AccountDto } from './account.dto';
import { FileDto } from './file.dto';
import { IFormPaymentInvoiceOptional } from '../../../modules/form-payment/service/form-payment.service.interface';
import { OrganizationDto, OrganizationRequisiteDto } from './organization.dto';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import { IContract } from 'lib/interfaces/models/contract.interface';
import { IdFieldDto } from '../id-field.dto';
import { CryptoRequisitesDto } from '../crypto-requisites.dto';
import { Requisite } from '../bank-requisites.dto';
import { CounterpartyApprovalStatus } from '../../enums/models/counterparty.enums';
import { RateValueSource } from '../../enums/models/currency.enums';

export class TransactionDto implements IFormPaymentTransaction {
  @ApiProperty()
  @IsMongoId()
  @Type(() => String)
  @IsNotEmpty()
  account: IAccount | string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  uuid: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  hash: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  chain: string;
}

export class Transaction1CDto extends TransactionDto {
  @ApiProperty()
  @IsMongoId()
  @Type(() => AccountDto)
  @IsNotEmpty()
  account: IAccount;
}

export class TransactionAddDto
  extends PickType(TransactionDto, ['hash', 'chain'])
  implements IFormPaymentTransactionAdd {}

export class TransactionRemoveDto
  extends PickType(TransactionDto, ['uuid'])
  implements Omit<IFormPaymentTransactionRemove, 'account'> {}

export class DocsForm implements IFormPaymentDocs {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  paymentOrder?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  paymentOrderDocx?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  paymentAdvanceOrder?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  paymentAdvanceOrderDocx?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  paymentOrderSigned?: string[] | IFile[];

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  treasurerOrder?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  treasurerOrderSigned?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  exportRevenueConfirmation?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  report?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  docxFile?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  reportSigned?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  archive?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  payments?: string[] | IFile[];

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  // доки об отгрузке товаров/услуг и любые другие заркывающие доки
  closing?: string[] | IFile[]; // обязательно нужно приложить в конце если direction=import

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  refund?: string[] | IFile[]; // подтверждение возврата средств

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  additional?: string[] | IFile[]; // дополнительные документы

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId({ each: true })
  swift?: string[] | IFile[]; // SWIFT документы загружаемые провайдером
}

export class DocsFullForm implements IFormPaymentDocs {
  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  paymentOrder?: IFile;

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  paymentOrderDocx?: IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => FileDto)
  paymentAdvanceOrder?: IFile;

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  paymentAdvanceOrderDocx?: IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => FileDto)
  paymentOrderSigned?: IFile[];

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  treasurerOrder?: IFile;

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  treasurerOrderSigned?: IFile;

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  exportRevenueConfirmation?: IFile;

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  report?: IFile;

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  docxFile?: IFile;

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  reportSigned?: IFile;

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  archive?: IFile;

  @ApiProperty({ required: false, type: [FileDto] })
  @IsOptional()
  @Type(() => FileDto)
  payments?: IFile[];

  @ApiProperty({ required: false, type: [FileDto] })
  @IsOptional()
  @Type(() => FileDto)
  // доки об отгрузке товаров/услуг и любые другие заркывающие доки
  closing?: IFile[]; // обязательно нужно приложить в конце если direction=import

  @ApiProperty({ required: false, type: [FileDto] })
  @IsOptional()
  @Type(() => FileDto)
  refund?: IFile[]; // подтверждение возврата средств

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => FileDto)
  additional?: IFile[]; // дополнительные документы

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => FileDto)
  swift?: IFile[]; // дополнительные документы
}

export class TotalsForm implements IFormPaymentTotals {
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  coverAmount?: number; // сумма покрытия

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feePercent?: number; // процент комиссии

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feeAmount?: number; // сумма комиссии

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feeFixCover?: number; // фиксированная сумма комиссии в валюте клиента

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feeFix?: number; // фиксированная сумма комиссии

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  feePaid?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidDate?: Date; // дата проведения платежа

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  differenceAmount?: number; // разница между totals.amount и linkedExportFormsTotalAmount (в валюте контрагента)

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feeAmountInCounterpartyCurrency?: number; // feeAmount пересчитанный в валюту контрагента по currency.rate

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  differenceAmountClientCur?: number; // differenceAmount конвертированный в валюту клиента (differenceAmount * currency.rate)
}
export class FormCurrency implements IFormPaymentCurrency {
  @ApiProperty({ enum: AllCurrencies })
  @IsEnum(AllCurrencies)
  @IsNotEmpty()
  client: AllCurrencies;

  @ApiProperty({ type: CryptoRequisitesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CryptoRequisitesDto)
  clientCryptoRequisites?: CryptoRequisitesDto;

  @ApiProperty({ enum: AllCurrencies })
  @IsEnum(AllCurrencies)
  @IsNotEmpty()
  counterparty: AllCurrencies;

  @ApiProperty({ required: false, enum: AllCurrencies })
  @IsEnum(AllCurrencies)
  @IsOptional()
  fixFeeCurrency?: AllCurrencies;

  @ApiProperty({ type: CryptoRequisitesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CryptoRequisitesDto)
  counterpartyCryptoRequisites?: CryptoRequisitesDto;

  @ApiProperty({ required: false, enum: AllCurrencies })
  @IsEnum(AllCurrencies)
  @IsOptional()
  base?: AllCurrencies;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rate?: number;

  @ApiProperty({ required: false, enum: RateValueSource })
  @IsEnum(RateValueSource)
  @IsOptional()
  rateSource?: RateValueSource;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fixFeeRate?: number;

  @ApiProperty({ required: false, enum: RateValueSource })
  @IsEnum(RateValueSource)
  @IsOptional()
  fixFeeRateSource?: RateValueSource;
}

export class FormShortInvoiceOptions implements IFormPaymentInvoiceOptional {
  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  file?: string;
}

export class FormShortInvoice implements Omit<IFormPaymentInvoice, 'uuid'> {
  @ApiProperty({ description: 'file._id' })
  @IsNotEmpty()
  @Type(() => String)
  @IsMongoId()
  file: string;
}

export class FormInvoiceDto implements IFormPaymentInvoice {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  uuid?: string;

  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  file?: string | IFile;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contractNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  contractDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  invoiceDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadlineShipment?: Date;

  @ApiProperty({ required: false, enum: FormPaymentKind })
  @IsEnum(FormPaymentKind)
  @IsOptional()
  kind?: FormPaymentKind; // товар/услуга

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  hsCode?: string; // обязательно, если kind=good
}

export class FormInvoiceUpdateDto extends FormInvoiceDto {
  @Exclude()
  recognizeLines?: string[];

  @Exclude()
  recognized?: IFormRecognized;
}

export class Form1CInvoiceDto extends FormInvoiceDto {
  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @Type(() => FileDto)
  @IsMongoId()
  file?: IFile;
}

export class FormBankDetails implements IFormBankDetails {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  swiftCode: string; // swift code банка

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  bankName: string; // Банк компании контрагента

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  bankCountry: string; // Банк компании контрагента

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  bankAddress: string; // Банк компании контрагента

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string; // Наименование компании контрагента

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  address: string; // Адрес компании контрагента

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  legalAddress?: string; // Юридический адрес компании

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  accountNumber: string; // Номер счета конечного получателя средств

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  beneficiaryWebsite?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiProperty({
    required: false,
    enum: CounterpartyApprovalStatus,
    description: 'Статус одобрения контрагента из реестра',
  })
  @IsOptional()
  @IsEnum(CounterpartyApprovalStatus)
  lastApprovalStatus?: CounterpartyApprovalStatus | null;
}

export class FormBankDetailsOptional extends PartialType(FormBankDetails) implements Partial<IFormBankDetails> {}

export class FormPaymentOrganizationDto
  extends OmitType(OrganizationDto, ['requisites'])
  implements Omit<IOrganization, 'managers'>
{
  @ApiProperty({ type: OrganizationRequisiteDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationRequisiteDto)
  requisite?: OrganizationRequisiteDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  refOrganizationId?: string;

  @ApiProperty({ required: true, default: false })
  @IsBoolean()
  isChanged: boolean;
}

export class ComplianceReportErrorDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  timestamp: Date;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  attempts: number;
}

export class ComplianceReportDto {
  @ApiProperty({ required: false, description: 'Текст ответа от ChatGPT с анализом контрагента' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ required: false, enum: ChatGptStatus, description: 'Статус анализа ChatGPT' })
  @IsOptional()
  @IsEnum(ChatGptStatus)
  status?: ChatGptStatus;

  @ApiProperty({ required: false, type: ComplianceReportErrorDto, description: 'Информация об ошибке при анализе' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComplianceReportErrorDto)
  error?: ComplianceReportErrorDto;

  @ApiProperty({ required: false, description: 'Дата создания отчета' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createdDate?: Date;

  @ApiProperty({ required: false, description: 'Дата последнего обновления отчета' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updatedDate?: Date;
}

export class FormPaymentBaseDto implements IFormPaymentBase {
  @ApiProperty()
  @IsMongoId()
  @Type(() => String)
  @IsNotEmpty()
  account: IAccount | string;

  @ApiProperty({ enum: FormPaymentStatus })
  @IsEnum(FormPaymentStatus)
  @IsNotEmpty()
  status: FormPaymentStatus;

  @ApiProperty({ enum: FormPaymentStatus })
  @IsEnum(FormPaymentStatus)
  @IsNotEmpty()
  prevStatus: FormPaymentStatus;

  @ApiProperty({ enum: FormPaymentStage })
  @IsEnum(FormPaymentStage)
  @IsNotEmpty()
  stage: FormPaymentStage;

  @ApiProperty({ required: false, enum: FormPaymentDirection })
  @IsEnum(FormPaymentDirection)
  @IsOptional()
  direction?: FormPaymentDirection;

  @ApiProperty({ required: false, type: FormCurrency })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormCurrency)
  currency?: FormCurrency;

  @ApiProperty({ required: false, type: TotalsForm })
  @IsOptional()
  @ValidateNested()
  @Type(() => TotalsForm)
  totals?: TotalsForm;

  @ApiProperty({ required: false, type: DocsForm })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocsForm)
  docs?: DocsForm;

  @ApiProperty({ required: false, type: () => FileDto, description: 'Файл контракта' })
  @IsOptional()
  @Type(() => FileDto)
  contract?: IFile | string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  importFile?: string | IFile;

  @ApiProperty({ required: false, type: [TransactionDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  transactions?: TransactionDto[];

  @ApiProperty({ required: false, type: [TransactionDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  refundTransactions?: TransactionDto[];

  @ApiProperty({ required: false, enum: FormPaymentCondition })
  @IsEnum(FormPaymentCondition)
  @IsOptional()
  counterpartyPaymentCondition?: FormPaymentCondition;

  @ApiProperty({ required: false, enum: FormPaymentCondition })
  @IsEnum(FormPaymentCondition)
  @IsOptional()
  platformPaymentCondition?: FormPaymentCondition;

  @ApiProperty({ required: false, enum: PlatformPostpayMode })
  @IsEnum(PlatformPostpayMode)
  @IsOptional()
  platformPostpayMode?: PlatformPostpayMode;

  @ApiProperty({ required: false, enum: FormPaymentCondition })
  @IsEnum(FormPaymentCondition)
  @IsOptional()
  paymentAgencyFeeCondition?: FormPaymentCondition;

  @ApiProperty({ required: false, type: [FormInvoiceDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FormInvoiceDto)
  invoices?: FormInvoiceDto[];

  @ApiProperty({ required: false, type: FormBankDetails })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormBankDetails)
  // получатель
  counterparty?: FormBankDetails;

  @ApiProperty({ required: false, type: FormBankDetails })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormBankDetails)
  // посредник
  intermediary?: FormBankDetails;

  @ApiProperty({ required: false })
  @IsMongoId()
  @Type(() => String)
  @IsOptional()
  provider?: IAccount | string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @Type(() => String)
  @IsOptional()
  preferedProvider?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @Type(() => String)
  @IsOptional()
  agent?: string | IAgent;

  @ApiProperty({ required: false, type: [Requisite] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Requisite)
  agentRequisites?: Requisite[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  uid?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  rejectedAgentContracts?: IContract[];

  // Поля для функционала копирования заявок
  @ApiProperty({ required: false, description: 'ID исходной заявки, из которой скопировали' })
  @IsOptional()
  @IsString()
  sourceFormId?: string;

  @ApiProperty({ required: false, description: 'Дата копирования' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  copyDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  sentDate?: Date;

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  signingOrderCreateDate?: Date; // Дата поручения принципала (сгенерированного или загруженного)

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  advanceSigningOrderCreateDate?: Date; // Дата дополнительного поручения принципала (сгенерированного или загруженного)

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormPaymentOrganizationDto)
  organization?: FormPaymentOrganizationDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isImportant?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormPaymentOrganizationDto)
  providerOrganization?: FormPaymentOrganizationDto;

  @ApiProperty({ required: false })
  @IsMongoId()
  @Type(() => String)
  @IsOptional()
  manager?: IAccount | string;

  @ApiProperty({ required: false, nullable: true })
  @Type(() => String)
  @IsOptional()
  rejectText?: string | null;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  moveToProviderDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  paymentByProviderDate?: Date;

  @ApiProperty({ required: false, description: 'Дата поступления покрытия (от казначея/менеджера)' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateReceiptOfCover?: Date;

  @ApiProperty({ required: false, description: 'Дата поступления комиссии' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateReceiptOfCommission?: Date;

  @ApiProperty({ required: false, type: ComplianceReportDto, description: 'Отчет о комплаенсе от ChatGPT' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComplianceReportDto)
  complianceReport?: ComplianceReportDto;

  @ApiProperty({
    required: false,
    type: [Object],
    description: 'Привязанные экспортные сделки (только для импортных сделок)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  linkedExportForms?: (string | IFormPayment)[];

  @ApiProperty({
    required: false,
    description: 'Флаг заморозки экспортной сделки (устанавливается при привязке к импортной)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFreeze?: boolean;

  @ApiProperty({
    required: false,
    description: 'Флаг доступности экспортной сделки (false когда импортная сделка перешла в SIGNING_ORDER_ACCEPTED)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({
    required: false,
    description: 'ID задачи казначея или полный объект задачи (для выплаты остатка по экспортной сделке)',
  })
  @IsOptional()
  task?: string | ITreasurerTask;

  @ApiProperty({
    required: false,
    description: 'Сумма долга для возврата по экспортной сделке (в валюте контрагента импортной сделки)',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  debtAmount?: number;

  @ApiProperty({
    required: false,
    description: 'Сумма amount конвертированная в целевую валюту (из query параметра convertToCurrency)',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  convertedAmount?: number;

  @ApiProperty({
    required: false,
    description: 'Сумма привязанных экспортных сделок в валюте контрагента импортной сделки',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  linkedExportFormsTotalAmount?: number;

  @ApiProperty({
    required: false,
    enum: FormPaymentStatus,
    enumName: 'FormPaymentStatus',
    description:
      'Статус переплаты: overpayment_export если сумма экспортных больше импортной, overpayment_import если импортная больше или равна экспортной',
  })
  @IsOptional()
  @IsEnum(FormPaymentStatus)
  overpaymentStatus?: FormPaymentStatus;

  @ApiProperty({ required: false, enum: FormPaymentPaymentMethod, enumName: 'FormPaymentPaymentMethod' })
  @IsEnum(FormPaymentPaymentMethod)
  @IsOptional()
  paymentMethod?: FormPaymentPaymentMethod;
}

export class FormPaymentDto extends IntersectionType(BaseDto, FormPaymentBaseDto) implements IFormPayment {}

export class FormPaymentWithAccountDto
  extends IntersectionType(BaseDto, OmitType(FormPaymentBaseDto, ['account']))
  implements IFormPayment
{
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => AccountDto)
  account: IAccount;

  @ApiProperty({ required: false, type: AgentDto })
  @Type(() => AgentDto)
  @IsOptional()
  agent?: IAgent;

  // Поля для функционала копирования заявок
  @ApiProperty({ required: false, description: 'ID исходной заявки, из которой скопировали' })
  @IsOptional()
  @IsString()
  sourceFormId?: string;

  @ApiProperty({ required: false, description: 'Дата копирования' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  copyDate?: Date;
}

export class FormPaymentWithAccountDocsDto
  extends IntersectionType(
    BaseDto,
    OmitType(FormPaymentBaseDto, ['account', 'docs', 'manager', 'provider', 'importFile']),
  )
  implements IFormPayment
{
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => AccountDto)
  account: IAccount;

  @ApiProperty({ required: false, type: AgentDto })
  @Type(() => AgentDto)
  @IsOptional()
  agent?: IAgent;

  @ApiProperty({ required: false, type: DocsFullForm })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocsFullForm)
  docs?: DocsFullForm;

  @ApiProperty({ required: false, type: FileDto })
  @IsOptional()
  @Type(() => FileDto)
  importFile?: IFile;

  @ApiProperty({ required: false, type: AccountDto })
  @IsOptional()
  @Type(() => AccountDto)
  manager: IAccount;

  @ApiProperty({ required: false, type: AccountDto })
  @IsOptional()
  @Type(() => AccountDto)
  provider: IAccount;
}

export class FormPaymentWithAgentProviderDto extends IntersectionType(BaseDto, FormPaymentBaseDto) {
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => AccountDto)
  account: IAccount;

  @ApiProperty({ type: AccountDto })
  @Type(() => AccountDto)
  @IsOptional()
  provider?: IAccount;

  @ApiProperty({ required: false, type: AgentDto })
  @Type(() => AgentDto)
  @IsOptional()
  agent?: IAgent;

  @ApiProperty({ required: false, type: DocsFullForm })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocsFullForm)
  docs?: DocsFullForm;

  @ApiProperty({ type: AccountDto })
  @Type(() => AccountDto)
  @IsOptional()
  manager?: IAccount;
}

export class FormPayment1CRequesterDto extends IntersectionType(BaseDto, OmitType(FormPaymentBaseDto, ['account'])) {
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => String)
  account: string;

  @ApiProperty({ type: AccountDto })
  @Type(() => AccountDto)
  @IsOptional()
  provider?: IAccount;

  @ApiProperty({ required: false, type: AgentDto })
  @Type(() => AgentDto)
  @IsOptional()
  agent?: IAgent;

  @ApiProperty({ required: false, type: DocsFullForm })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocsFullForm)
  docs?: DocsFullForm;

  @ApiProperty({ required: false, type: Form1CInvoiceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => Form1CInvoiceDto)
  invoice?: Form1CInvoiceDto;

  @ApiProperty({ required: false, type: [Transaction1CDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Transaction1CDto)
  transactions?: Transaction1CDto[];
}
export class FormPaymentByOrderAcceptedDto extends IdFieldDto implements IFormPaymentByOrderAccepted {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty({ enum: AllCurrencies })
  @IsEnum(AllCurrencies)
  @IsNotEmpty()
  currency: AllCurrencies;

  @ApiProperty()
  @IsDate()
  sentDate: Date;
}
