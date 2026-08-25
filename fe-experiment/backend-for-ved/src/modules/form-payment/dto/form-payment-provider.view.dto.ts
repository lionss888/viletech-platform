import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type, plainToInstance } from 'class-transformer';
import { IsArray, IsEnum, IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';
import * as _ from 'lodash';
import {
  FormPaymentCondition,
  FormPaymentDirection,
  FormPaymentStage,
  FormPaymentStatus,
  PlatformPostpayMode,
} from 'lib/enums/models/form-payment.enums';
import { FormBankDetails, FormCurrency, FormInvoiceDto, TotalsForm } from 'lib/dto/models/form-payment.dto';

/**
 * Paths / keys that must never appear on Provider API responses (client PII & non-payment docs).
 * Used by unit deny-list tests.
 */
export const PROVIDER_RESPONSE_DENY_KEYS = [
  'account',
  'manager',
  'complianceReport',
  'importFile',
  'linkedExportForms',
] as const;

export const PROVIDER_RESPONSE_DENY_NESTED_KEYS = [
  'email',
  'phone',
  'fullName',
  'telegram',
  'signerName',
  'signerPosition',
  'signerOtherPosition',
  'legalAddress',
  'organizationCard',
  'subaccounts',
] as const;

function toPlainRecord(model: unknown): Record<string, unknown> {
  if (_.isNil(model)) {
    return {};
  }
  const plain =
    typeof model === 'object' &&
    model !== null &&
    'toJSON' in model &&
    typeof (model as { toJSON: () => unknown }).toJSON === 'function'
      ? (model as { toJSON: () => unknown }).toJSON()
      : model;
  return JSON.parse(JSON.stringify(plain)) as Record<string, unknown>;
}

@Exclude()
export class ProviderOrgSlimDto {
  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inn?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  refOrganizationId?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessForm?: string;
}

@Exclude()
export class ProviderDocsSlimDto {
  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  paymentOrder?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  paymentOrderSigned?: string[];

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  paymentAdvanceOrder?: string;

  @Expose()
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  payments?: string[];

  @Expose()
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  swift?: string[];
}

@Exclude()
export class ProviderTransactionSlimDto {
  @Expose()
  @ApiProperty()
  @IsString()
  uuid: string;

  @Expose()
  @ApiProperty()
  @IsString()
  hash: string;

  @Expose()
  @ApiProperty()
  @IsString()
  chain: string;
}

@Exclude()
export class ProviderAgentSlimDto {
  @Expose()
  @ApiProperty()
  @IsMongoId()
  _id: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationName?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inn?: string;
}

/**
 * Narrow form-payment response for Provider role: payment execution fields only, no client Account PII.
 */
@Exclude()
export class FormPaymentProviderViewDto {
  @Expose()
  @ApiProperty()
  @IsMongoId()
  @Type(() => String)
  _id: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  createDate?: Date;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  updateDate?: Date;

  @Expose()
  @ApiProperty({ enum: FormPaymentStatus })
  @IsEnum(FormPaymentStatus)
  status: FormPaymentStatus;

  @Expose()
  @ApiProperty({ required: false, enum: FormPaymentStatus })
  @IsOptional()
  @IsEnum(FormPaymentStatus)
  prevStatus?: FormPaymentStatus;

  @Expose()
  @ApiProperty({ required: false, enum: FormPaymentStage })
  @IsOptional()
  @IsEnum(FormPaymentStage)
  stage?: FormPaymentStage;

  @Expose()
  @ApiProperty({ required: false, enum: FormPaymentDirection })
  @IsOptional()
  @IsEnum(FormPaymentDirection)
  direction?: FormPaymentDirection;

  @Expose()
  @ApiProperty({ required: false, type: FormCurrency })
  @IsOptional()
  currency?: FormCurrency;

  @Expose()
  @ApiProperty({ required: false, type: TotalsForm })
  @IsOptional()
  totals?: TotalsForm;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @Expose()
  @ApiProperty({ required: false, enum: FormPaymentCondition })
  @IsOptional()
  @IsEnum(FormPaymentCondition)
  platformPaymentCondition?: FormPaymentCondition;

  @Expose()
  @ApiProperty({ required: false, enum: PlatformPostpayMode })
  @IsOptional()
  @IsEnum(PlatformPostpayMode)
  platformPostpayMode?: PlatformPostpayMode;

  @Expose()
  @ApiProperty({ required: false, enum: FormPaymentCondition })
  @IsOptional()
  @IsEnum(FormPaymentCondition)
  counterpartyPaymentCondition?: FormPaymentCondition;

  @Expose()
  @ApiProperty({ required: false, type: FormBankDetails })
  @IsOptional()
  counterparty?: FormBankDetails;

  @Expose()
  @ApiProperty({ required: false, type: FormBankDetails })
  @IsOptional()
  intermediary?: FormBankDetails;

  @Expose()
  @ApiProperty({ required: false, type: [FormInvoiceDto] })
  @IsOptional()
  invoices?: FormInvoiceDto[];

  @Expose()
  @ApiProperty({ required: false, type: ProviderDocsSlimDto })
  @IsOptional()
  @Type(() => ProviderDocsSlimDto)
  docs?: ProviderDocsSlimDto;

  @Expose()
  @ApiProperty({ required: false, type: [ProviderTransactionSlimDto] })
  @IsOptional()
  @Type(() => ProviderTransactionSlimDto)
  transactions?: ProviderTransactionSlimDto[];

  @Expose()
  @ApiProperty({ required: false, type: ProviderOrgSlimDto })
  @IsOptional()
  @Type(() => ProviderOrgSlimDto)
  organization?: ProviderOrgSlimDto;

  @Expose()
  @ApiProperty({ required: false, type: ProviderAgentSlimDto })
  @IsOptional()
  @Type(() => ProviderAgentSlimDto)
  agent?: ProviderAgentSlimDto;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  @Type(() => String)
  provider?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rejectText?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  moveToProviderDate?: Date;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  paymentByProviderDate?: Date;
}

function fileRefToId(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null && '_id' in value) {
    return String((value as { _id: unknown })._id);
  }
  return undefined;
}

function mapDocs(docs: Record<string, unknown> | undefined): ProviderDocsSlimDto | undefined {
  if (!docs) {
    return undefined;
  }
  const payments = Array.isArray(docs.payments)
    ? docs.payments.map((item) => fileRefToId(item)).filter((id): id is string => Boolean(id))
    : undefined;
  const swift = Array.isArray(docs.swift)
    ? docs.swift.map((item) => fileRefToId(item)).filter((id): id is string => Boolean(id))
    : undefined;
  const paymentOrderSigned = Array.isArray(docs.paymentOrderSigned)
    ? docs.paymentOrderSigned.map((item) => fileRefToId(item)).filter((id): id is string => Boolean(id))
    : undefined;
  return plainToInstance(
    ProviderDocsSlimDto,
    {
      paymentOrder: fileRefToId(docs.paymentOrder),
      paymentAdvanceOrder: fileRefToId(docs.paymentAdvanceOrder),
      paymentOrderSigned,
      payments,
      swift,
    },
    { excludeExtraneousValues: true },
  );
}

function mapOrganization(organization: Record<string, unknown> | undefined): ProviderOrgSlimDto | undefined {
  if (!organization) {
    return undefined;
  }
  return plainToInstance(
    ProviderOrgSlimDto,
    {
      name: organization.name,
      inn: organization.inn,
      refOrganizationId: organization.refOrganizationId ?? organization._id,
      status: organization.status,
      businessForm: organization.businessForm,
    },
    { excludeExtraneousValues: true },
  );
}

function mapAgent(agent: unknown): ProviderAgentSlimDto | undefined {
  if (!agent) {
    return undefined;
  }
  if (typeof agent === 'string') {
    return plainToInstance(ProviderAgentSlimDto, { _id: agent }, { excludeExtraneousValues: true });
  }
  const record = agent as Record<string, unknown>;
  return plainToInstance(
    ProviderAgentSlimDto,
    {
      _id: record._id,
      organizationName: record.organizationName,
      inn: record.inn,
    },
    { excludeExtraneousValues: true },
  );
}

function mapProviderId(provider: unknown): string | undefined {
  if (!provider) {
    return undefined;
  }
  if (typeof provider === 'string') {
    return provider;
  }
  if (typeof provider === 'object' && provider !== null && '_id' in provider) {
    return String((provider as { _id: unknown })._id);
  }
  return undefined;
}

/**
 * Maps a form-payment model to the Provider-safe view (strips client Account and org contact PII).
 */
export function toFormPaymentProviderView(model: unknown): FormPaymentProviderViewDto {
  const plain = toPlainRecord(model);
  const transactions = Array.isArray(plain.transactions)
    ? plain.transactions.map((tx: Record<string, unknown>) =>
        plainToInstance(
          ProviderTransactionSlimDto,
          { uuid: tx.uuid, hash: tx.hash, chain: tx.chain },
          { excludeExtraneousValues: true },
        ),
      )
    : undefined;
  return plainToInstance(
    FormPaymentProviderViewDto,
    {
      _id: plain._id,
      createDate: plain.createDate,
      updateDate: plain.updateDate,
      status: plain.status,
      prevStatus: plain.prevStatus,
      stage: plain.stage,
      direction: plain.direction,
      currency: plain.currency,
      totals: plain.totals,
      amount: plain.amount,
      platformPaymentCondition: plain.platformPaymentCondition,
      platformPostpayMode: plain.platformPostpayMode,
      counterpartyPaymentCondition: plain.counterpartyPaymentCondition,
      counterparty: plain.counterparty,
      intermediary: plain.intermediary,
      invoices: plain.invoices,
      docs: mapDocs(plain.docs as Record<string, unknown> | undefined),
      transactions,
      organization: mapOrganization(plain.organization as Record<string, unknown> | undefined),
      agent: mapAgent(plain.agent),
      provider: mapProviderId(plain.provider),
      rejectText: plain.rejectText,
      moveToProviderDate: plain.moveToProviderDate,
      paymentByProviderDate: plain.paymentByProviderDate,
    },
    { excludeExtraneousValues: true },
  );
}

/**
 * Maps paginated provider list docs to Provider-safe views.
 */
export function toFormPaymentProviderViewPage(result: {
  docs: unknown[];
  hasNext: boolean;
  limit: number;
  page?: number;
  offset?: number;
}): { docs: FormPaymentProviderViewDto[]; hasNext: boolean; limit: number; page?: number; offset?: number; items: FormPaymentProviderViewDto[] } {
  const docs = result.docs.map((doc) => toFormPaymentProviderView(doc));
  return {
    ...result,
    docs,
    items: docs,
  };
}
