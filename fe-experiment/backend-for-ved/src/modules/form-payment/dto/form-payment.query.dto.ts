import { Transform, Type } from 'class-transformer';
import { PaginateDto } from 'lib/dto/paginate.dto';
import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { BaseOptionsDto } from 'lib/dto/base.options.dto';
import { IdFieldQueryDto } from 'lib/dto/id-field.query.dto';
import { IdsFieldQueryDto } from 'lib/dto/ids-field.query.dto';
import { IFormPaymentForLiquidityGlassQuery, IFormPaymentQuery } from '../service/form-payment.service.interface';
import { IPaginateOptions } from 'lib/interfaces/paginate.interface';
import {
  IsArray,
  IsDate,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsString,
  IsNumber,
  Min,
  isBooleanString,
  isMongoId,
  isArray,
  isBoolean,
} from 'class-validator';
import { IFormPaymentOneCQuery } from '../service/additional/form-payment-one-c.service.interface';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import {
  FormPaymentCondition,
  FormPaymentDirection,
  FormPaymentStage,
  FormPaymentStatus,
  PlatformPostpayMode,
} from 'lib/enums/models/form-payment.enums';
import { StringToBoolean, ValueToArray } from '../../../lib/utils/transform.utils';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import { TransformToArray } from 'lib/decorators/TransformToArray.decorator';
import { BadRequestException } from '@nestjs/common';
import { stringToBoolean } from '../../../lib/utils/helpers/transform.helper';

export class FormPaymentSiteQueryDto extends IdsFieldQueryDto implements IFormPaymentQuery {
  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Type(() => String)
  search?: string;

  @ApiProperty({ type: Number, required: false, description: 'id заявки' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  uid?: number;

  @ApiProperty({ enum: FormPaymentStatus, enumName: 'FormPaymentStatus', required: false })
  @IsOptional()
  @IsEnum(FormPaymentStatus)
  status?: FormPaymentStatus;

  @ApiProperty({ type: [FormPaymentStatus], enum: FormPaymentStatus, enumName: 'FormPaymentStatus', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(FormPaymentStatus, { each: true })
  @TransformToArray()
  statuses?: FormPaymentStatus[];

  @IsOptional()
  @IsEnum(FormPaymentDirection)
  @ApiProperty({ enum: FormPaymentDirection, enumName: 'FormPaymentDirection', required: false })
  direction?: FormPaymentDirection;

  @ApiProperty({ required: false, enum: FormPaymentCondition })
  @IsOptional()
  @IsEnum(FormPaymentCondition)
  platformPaymentCondition?: FormPaymentCondition;

  @ApiProperty({ required: false, enum: PlatformPostpayMode })
  @IsOptional()
  @IsEnum(PlatformPostpayMode)
  platformPostpayMode?: PlatformPostpayMode;

  @ApiProperty({ required: false, type: [String], enum: PlatformPostpayMode })
  @IsOptional()
  @IsArray()
  @IsEnum(PlatformPostpayMode, { each: true })
  @TransformToArray()
  platformPostpayModes?: PlatformPostpayMode[];

  @IsOptional()
  @IsBoolean()
  @StringToBoolean()
  @ApiProperty({ required: false })
  isOrderAccepted?: boolean;

  @ApiProperty({ required: false, enum: AllCurrencies })
  @IsOptional()
  @IsEnum(AllCurrencies)
  clientCurrency?: AllCurrencies;

  @ApiProperty({ type: [String], enum: AllCurrencies, enumName: 'AllCurrencies', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(AllCurrencies, { each: true })
  @TransformToArray()
  clientCurrencies?: AllCurrencies[];

  @ApiProperty({ required: false, enum: AllCurrencies })
  @IsOptional()
  @IsEnum(AllCurrencies)
  counterpartyCurrency?: AllCurrencies;

  @ApiProperty({ type: [String], enum: AllCurrencies, enumName: 'AllCurrencies', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(AllCurrencies, { each: true })
  @TransformToArray()
  counterpartyCurrencies?: AllCurrencies[];

  @ApiProperty({ type: Number, required: false, description: 'Минимальная сумма платежа' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  amountGte?: number;

  @ApiProperty({ type: Number, required: false, description: 'Максимальная сумма платежа' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  amountLte?: number;

  @ApiProperty({ type: [String], enum: FormPaymentDirection, enumName: 'FormPaymentDirection', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(FormPaymentDirection, { each: true })
  @TransformToArray()
  directions?: FormPaymentDirection[];

  @ApiProperty({ type: String, format: 'date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  sentDateGte?: Date;

  @ApiProperty({ type: String, format: 'date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  sentDateLt?: Date;

  @ApiProperty({ type: String, format: 'date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createDateGte?: Date;

  @ApiProperty({ type: String, format: 'date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createDateLt?: Date;

  @ApiProperty({ type: String, format: 'date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updateDateGte?: Date;

  @ApiProperty({ type: String, format: 'date', required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  updateDateLt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @StringToBoolean()
  isImportant?: boolean;

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  manager?: string;

  @ApiProperty({ type: [String], required: false, description: 'ID менеджеров' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @TransformToArray()
  managers?: string[];

  @ApiProperty({ type: String, required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  provider?: string;

  @ApiProperty({ type: [String], required: false, description: 'ID провайдеров' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @TransformToArray()
  providers?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clientOrganizationName?: string;

  @ApiProperty({ enum: FormPaymentStage, required: false, type: [FormPaymentStage] })
  @IsOptional()
  @ValueToArray()
  @IsEnum(FormPaymentStage, { each: true })
  stages?: FormPaymentStage[];

  @ApiProperty({ enum: FormPaymentStage, required: false })
  @IsOptional()
  @IsEnum(FormPaymentStage)
  stage?: FormPaymentStage;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @StringToBoolean()
  isProviderCompletedPayment?: boolean;
}

export class FormPaymentSitePaginateDto
  extends IntersectionType(FormPaymentSiteQueryDto, PaginateDto)
  implements IFormPaymentQuery, IPaginateOptions {}

export class FormPaymentQueryDto
  extends IntersectionType(IdFieldQueryDto, FormPaymentSiteQueryDto)
  implements IFormPaymentQuery
{
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  account?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => String)
  @IsMongoId()
  agent?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(FormPaymentStatus, { each: true })
  forImportByStatuses?: FormPaymentStatus[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(FormPaymentStatus, { each: true })
  forExportByStatuses?: FormPaymentStatus[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationInn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  coverAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  feeAmount?: number;

  @ApiProperty({ required: false, enum: AllCurrencies })
  @IsOptional()
  @IsEnum(AllCurrencies)
  clientCurrency?: AllCurrencies;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsMongoId()
  organization?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(FormPaymentStatus, { each: true })
  @ApiProperty({ type: [FormPaymentStatus], enum: FormPaymentStatus, enumName: 'FormPaymentStatus', required: false })
  notInStatuses?: FormPaymentStatus[];

  @ApiProperty({
    required: false,
    isArray: true,
    description: 'true | false | id | id[]',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (isBooleanString(value) || isBoolean(value)) return stringToBoolean(value.toString());
    if (isMongoId(value)) return value;
    if (isArray(value) && value.every((id) => isMongoId(id))) return value;
    throw new BadRequestException('providerOrganization must be a boolean or mongodb id or array mongodb id value');
  })
  providerOrganization?: string[];
}

export class FormPaymentAdminPaginateDto
  extends IntersectionType(FormPaymentQueryDto, PaginateDto)
  implements IFormPaymentQuery, IPaginateOptions {}

export class FormPaymentPaginateDto
  extends IntersectionType(FormPaymentAdminPaginateDto, BaseOptionsDto)
  implements IFormPaymentQuery, IPaginateOptions, IBaseOptions {}

export class FormPaymentByOrderAcceptedQuery implements IFormPaymentForLiquidityGlassQuery {
  @ApiProperty({ enum: FormPaymentDirection, enumName: 'FormPaymentDirection' })
  @IsNotEmpty()
  @IsEnum(FormPaymentDirection)
  direction: FormPaymentDirection;
}

export class FormPaymentByOrderAcceptedPaginateDto
  extends IntersectionType(FormPaymentByOrderAcceptedQuery, PaginateDto)
  implements IFormPaymentForLiquidityGlassQuery, IPaginateOptions {}

export class FormPaymentRPCQueryDto {
  @IsNotEmpty()
  @Type(() => FormPaymentQueryDto)
  @ValidateNested()
  query: FormPaymentQueryDto;

  @IsOptional()
  @Type(() => BaseOptionsDto)
  @ValidateNested()
  options?: BaseOptionsDto;
}

export class FormPaymentOneCQueryDto extends IdsFieldQueryDto implements IFormPaymentOneCQuery {
  @ApiProperty({ enum: FormPaymentStatus, enumName: 'FormPaymentStatus', required: false })
  @IsOptional()
  @IsEnum(FormPaymentStatus)
  status?: FormPaymentStatus;

  @ApiProperty({ type: [FormPaymentStatus], enum: FormPaymentStatus, enumName: 'FormPaymentStatus', required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(FormPaymentStatus, { each: true })
  @TransformToArray()
  statuses?: FormPaymentStatus[];

  @ApiProperty({ enum: FormPaymentDirection, enumName: 'FormPaymentDirection', required: false })
  @IsOptional()
  @IsEnum(FormPaymentDirection)
  direction?: FormPaymentDirection;

  @ApiProperty({ type: Date, required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createDateGte?: Date;

  @ApiProperty({ type: Date, required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  createDateLt?: Date;

  @ApiProperty({ type: Date, required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  orderAcceptanceDateGte?: Date;

  @ApiProperty({ type: Date, required: false })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  orderAcceptanceDateLt?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  agentId?: string;
}

export class FormPaymentOneCPaginateDto
  extends IntersectionType(FormPaymentOneCQueryDto, PaginateDto)
  implements IFormPaymentQuery, IPaginateOptions {}
