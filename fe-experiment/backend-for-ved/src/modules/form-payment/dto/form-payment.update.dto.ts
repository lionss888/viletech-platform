import {
  IFormUpdate,
  IFormUpdateAdditionalByUser,
  IFormUpdateByUser,
  IFormUpdateClientOrganizationByAdmin,
  IFormUpdateClosingByUser,
  IFormUpdateOrderByUser,
  IFormUpdateByProvider,
  IFormUpdatePaymentsByUser,
  IFormUpdateReportByUser,
  IFormUpdateReportByAdmin,
  IFormUpdateWithPlatformPaymentConditionAndDirection,
} from '../service/form-payment.service.interface';
import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
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
  IsUUID,
  Matches,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  DocsForm,
  FormBankDetailsOptional,
  FormCurrency,
  TotalsForm,
  TransactionAddDto,
  TransactionRemoveDto,
} from 'lib/dto/models/form-payment.dto';
import {
  FormPaymentCondition,
  FormPaymentDirection,
  FormPaymentStatus,
  PlatformPostpayMode,
  FormPaymentPaymentMethod,
} from '../../../lib/enums/models/form-payment.enums';
import { PaymentChargeType } from '../../../lib/enums/models/payment.enums';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import { FormPaymentQueryDto } from './form-payment.query.dto';
import { BaseOptionsDto } from '../../../lib/dto/base.options.dto';
import { IAgent } from '../../../lib/interfaces/models/agent.interface';
import { IGenerateOrder } from '../service/additional/generate-docs.service.interface';
import { OrganizationAdminUpdateDto } from 'modules/organization/dto/organization.update.dto';
import { IOrganizationSubaccount } from 'lib/interfaces/models/organization.interface';
import { OrganizationSubaccountShortAccountDto } from 'lib/dto/models/organization.dto';
import { CryptoRequisitesDto } from 'lib/dto/crypto-requisites.dto';
import {
  OrganizationSignerPositionType,
  OrganizationBusinessFormType,
} from '../../../lib/enums/models/organization.enums';
import { Requisite } from 'lib/dto/bank-requisites.dto';

export class FormPaymentUserUpdateDto implements IFormUpdateByUser {
  @ApiProperty({ required: false, enum: FormPaymentDirection })
  @IsEnum(FormPaymentDirection)
  @IsOptional()
  direction?: FormPaymentDirection;

  @ApiProperty({ required: false, enum: FormPaymentCondition })
  @IsEnum(FormPaymentCondition)
  @IsOptional()
  paymentCondition?: FormPaymentCondition;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  organization?: string;

  @ApiProperty({ required: false, nullable: true, description: 'contract file._id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => String)
  @IsMongoId()
  contract?: string | null;

  @ApiProperty({ required: false, type: FormBankDetailsOptional })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormBankDetailsOptional)
  // получатель
  counterparty?: FormBankDetailsOptional;

  @ApiProperty({ required: false, description: 'Reference to Counterparty registry entry' })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  counterpartyRef?: string;

  @ApiProperty({ required: false, description: 'UUID of selected bank from counterparty' })
  @IsOptional()
  @IsUUID()
  @Type(() => String)
  counterpartyBankUuid?: string;

  @ApiProperty({ required: false, description: 'UUID of selected account from counterparty bank' })
  @IsOptional()
  @IsUUID()
  @Type(() => String)
  counterpartyAccountUuid?: string;

  @ApiProperty({ required: false, type: FormBankDetailsOptional })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormBankDetailsOptional)
  // посредник
  intermediary?: FormBankDetailsOptional;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @ApiProperty({ required: false, enum: AllCurrencies })
  @IsEnum(AllCurrencies)
  @IsOptional()
  currencyClient?: AllCurrencies;

  @ApiProperty({ required: false, type: CryptoRequisitesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CryptoRequisitesDto)
  clientCryptoRequisites?: CryptoRequisitesDto;

  @ApiProperty({ required: false, enum: AllCurrencies })
  @IsEnum(AllCurrencies)
  @IsOptional()
  currencyCounterparty?: AllCurrencies;

  @ApiProperty({ required: false, type: CryptoRequisitesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CryptoRequisitesDto)
  counterpartyCryptoRequisites?: CryptoRequisitesDto;

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  addAdditional?: string[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removeAdditional?: string[];

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

  // Partial organization updates (only under special conditions)
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  organizationName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  organizationFullName?: string;

  @ApiProperty({ required: false, enum: OrganizationBusinessFormType })
  @IsOptional()
  @IsEnum(OrganizationBusinessFormType)
  organizationBusinessForm?: OrganizationBusinessFormType;

  @ApiProperty({ required: false, description: 'Preferred provider (organization) from suggested providers list' })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  preferedProvider?: string;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Массив ID экспортных сделок со статусом PAYMENT_RECEIVED для привязки к импортной сделке',
  })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  linkedExportForms?: string[];

  @ApiProperty({ required: false, enum: FormPaymentPaymentMethod, enumName: 'FormPaymentPaymentMethod' })
  @IsEnum(FormPaymentPaymentMethod)
  @IsOptional()
  paymentMethod?: FormPaymentPaymentMethod;
}

export class FormPaymentUserUpdateOrderDto implements Omit<IFormUpdateOrderByUser, 'status'> {
  @ApiProperty({ description: 'file._id' })
  @IsNotEmpty()
  @Type(() => String)
  @IsMongoId()
  paymentOrderSigned: string;
}

export class FormPaymentPayments implements IFormUpdatePaymentsByUser {
  @ApiProperty({ required: false, description: 'file._id[]', type: [String] })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  addPayments?: string[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removePayments?: string[];

  @ApiProperty({ required: false, type: String, description: 'file._id' })
  @IsOptional()
  @IsString()
  @Type(() => String)
  @IsMongoId()
  paymentOrderSigned?: string;

  @ApiProperty({ type: [TransactionAddDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionAddDto)
  addTransactions?: TransactionAddDto[];

  @ApiProperty({ type: [TransactionRemoveDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionRemoveDto)
  removeTransactions?: TransactionRemoveDto[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  addAdditional?: string[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removeAdditional?: string[];
}

export class FormPaymentUserUpdatePaymentsDto extends FormPaymentPayments implements IFormUpdatePaymentsByUser {
  @ApiProperty({ type: [TransactionAddDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionAddDto)
  addTransactions?: TransactionAddDto[];

  @ApiProperty({ type: [TransactionRemoveDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionRemoveDto)
  removeTransactions?: TransactionRemoveDto[];
}

export class FormPaymentUserUpdateReportDto implements Omit<IFormUpdateReportByUser, 'status'> {
  @ApiProperty({ required: false, description: 'file._id' })
  @IsNotEmpty()
  @Type(() => String)
  @IsMongoId()
  reportSigned: string;
}

export class FormPaymentAdminUpdateReportDto implements IFormUpdateReportByAdmin {
  @ApiProperty({ required: false, description: 'file._id' })
  @IsNotEmpty()
  @Type(() => String)
  @IsMongoId()
  reportSigned: string;
}

export class FormPaymentUserUpdateClosingDto implements IFormUpdateClosingByUser {
  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  addClosing?: string[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removeClosing?: string[];
}

export class FormPaymentClientOrganizationAdminUpdateDto
  extends PickType(OrganizationAdminUpdateDto, [
    'email',
    'phone',
    'signerName',
    'signerPosition',
    'signerOtherPosition',
  ])
  implements IFormUpdateClientOrganizationByAdmin {}

export class FormPaymentProviderOrganizationUpdateDto {
  @ApiProperty({ required: true })
  @IsMongoId()
  @Type(() => String)
  _id: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @Type(() => String)
  @IsOptional()
  requisiteId?: string;
}

export class ComplianceReportUpdateDto {
  @ApiProperty({ required: false, description: 'Text content of compliance report' })
  @IsOptional()
  @IsString()
  text?: string;
}

export class FormPaymentAdminUpdateDto implements IFormUpdate {
  @ApiProperty({ required: false })
  @IsMongoId()
  @Type(() => String)
  @IsOptional()
  provider?: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @Type(() => String)
  @IsOptional()
  agent?: IAgent;

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

  @ApiProperty({ required: false, enum: FormPaymentCondition })
  @IsEnum(FormPaymentCondition)
  @IsOptional()
  platformPaymentCondition?: FormPaymentCondition;

  @ApiProperty({ required: false, enum: PlatformPostpayMode })
  @IsEnum(PlatformPostpayMode)
  @IsOptional()
  platformPostpayMode?: PlatformPostpayMode;

  @ApiProperty({ required: false, type: [Requisite] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Requisite)
  agentRequisites?: Requisite[];

  @ApiProperty({ type: [TransactionAddDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionAddDto)
  addTransactions?: TransactionAddDto[];

  @ApiProperty({ type: [TransactionRemoveDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionRemoveDto)
  removeTransactions?: TransactionRemoveDto[];

  @ApiProperty({ type: [TransactionAddDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionAddDto)
  addRefundTransactions?: TransactionAddDto[];

  @ApiProperty({ type: [TransactionRemoveDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TransactionRemoveDto)
  removeRefundTransactions?: TransactionRemoveDto[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  addRefundDocuments?: string[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removeRefundDocuments?: string[];

  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  report?: string;

  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  docxFile?: string;

  @ApiProperty({ required: false, nullable: true, description: 'contract file._id' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => String)
  @IsMongoId()
  contract?: string | null;

  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  paymentOrder?: string;

  @ApiProperty({ required: false, description: 'file._id' })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  paymentAdvanceOrder?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  signingOrderCreateDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  advanceSigningOrderCreateDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateReceiptOfCover?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateReceiptOfCommission?: Date;

  @ApiProperty({ required: false, type: FormPaymentProviderOrganizationUpdateDto })
  @IsOptional()
  @Type(() => FormPaymentProviderOrganizationUpdateDto)
  @ValidateNested()
  updateProviderOrganization?: FormPaymentProviderOrganizationUpdateDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => FormPaymentClientOrganizationAdminUpdateDto)
  organization?: FormPaymentClientOrganizationAdminUpdateDto;

  @ApiProperty({ required: false })
  @IsMongoId()
  @Type(() => String)
  @IsOptional()
  manager?: string;

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  addAdditional?: string[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removeAdditional?: string[];

  @ApiProperty({ required: false, description: 'Compliance report text for editing' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComplianceReportUpdateDto)
  complianceReport?: ComplianceReportUpdateDto;
}

export class FormPaymentProviderUpdateDto
  extends IntersectionType(FormPaymentPayments, PickType(FormPaymentAdminUpdateDto, ['updateProviderOrganization']))
  implements IFormUpdateByProvider
{
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  addSwift?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removeSwift?: string[];
}

export class FormPaymentUpdateDto {
  @ApiProperty({ required: false, enum: FormPaymentStatus })
  @IsEnum(FormPaymentStatus)
  @IsOptional()
  status?: FormPaymentStatus;

  @ApiProperty({ required: false, enum: FormPaymentStatus })
  @IsEnum(FormPaymentStatus)
  @IsOptional()
  prevStatus?: FormPaymentStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isOrderAccepted?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isOrganizationConfirmed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationSignerName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEnum(OrganizationSignerPositionType)
  organizationSignerPosition?: OrganizationSignerPositionType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationInn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationOgrn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationKpp?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationLegalAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationFullName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationBusinessForm?: string;
}

export class FormPaymentRPCUpdateDto {
  @IsNotEmpty()
  @Type(() => FormPaymentQueryDto)
  @ValidateNested()
  query: FormPaymentQueryDto;

  @IsNotEmpty()
  @Type(() => FormPaymentUpdateDto)
  @ValidateNested()
  update: FormPaymentUpdateDto;

  @IsOptional()
  @Type(() => BaseOptionsDto)
  @ValidateNested()
  options?: BaseOptionsDto;
}

export class FormPaymentApplyPaymentRpcDto {
  @IsNotEmpty()
  @IsMongoId()
  @Type(() => String)
  formPaymentId: string;

  @IsNotEmpty()
  @IsEnum(PaymentChargeType)
  chargeType: PaymentChargeType;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  payDate: Date;

  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;
}

export class GenerateOrderDto implements IGenerateOrder {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  clientOrganization: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  organizationName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  signer: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  isAdvance: boolean;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  agent?: string;
}

export class FormPaymentUserUpdateAdditionalDto implements IFormUpdateAdditionalByUser {
  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  addAdditional?: string[];

  @ApiProperty({ required: false, type: [String], description: 'file._id[]' })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsMongoId({ each: true })
  removeAdditional?: string[];
}

export class FormPaymentUpdateWithPlatformPaymentConditionAndDirection
  implements IFormUpdateWithPlatformPaymentConditionAndDirection
{
  @ApiProperty({ required: false, enum: FormPaymentCondition })
  @IsEnum(FormPaymentCondition)
  @IsOptional()
  platformPaymentCondition?: FormPaymentCondition;

  @ApiProperty({ required: false, enum: PlatformPostpayMode })
  @IsEnum(PlatformPostpayMode)
  @IsOptional()
  platformPostpayMode?: PlatformPostpayMode;

  @ApiProperty({ required: false, enum: FormPaymentDirection })
  @IsEnum(FormPaymentDirection)
  @IsOptional()
  direction?: FormPaymentDirection;
}

export class FormPaymentRPCSyncOrganizationSubaccountsDto {
  @IsNotEmpty()
  @IsMongoId()
  @Type(() => String)
  account: string;

  @Type(() => String)
  @IsMongoId()
  organizationId: string;

  @Type(() => OrganizationSubaccountShortAccountDto)
  @ValidateNested({ each: true })
  subaccounts: IOrganizationSubaccount[];
}

// VF-2: DTO для отправки документа на подписание через Diadoc
export class FormPaymentSignViaDiadocDto {
  @ApiProperty({ required: false, description: 'ИНН получателя (если не указан, используется ИНН организации из заявки)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$|^\d{12}$/, { message: 'ИНН должен содержать 10 или 12 цифр' })
  recipientInn?: string;
}
