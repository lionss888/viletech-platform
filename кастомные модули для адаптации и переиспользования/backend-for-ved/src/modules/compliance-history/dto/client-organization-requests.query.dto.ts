import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginateDto } from 'lib/dto/paginate.dto';
import { IPaginateOptions } from 'lib/interfaces/paginate.interface';
import { FormPaymentDirection } from 'lib/enums/models/form-payment.enums';
import { AllCurrencies } from 'lib/enums/common.enums';

export enum RequestStatusFilterType {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  OTHER = 'other',
}

export class ClientOrganizationRequestsQueryDto {
  @ApiProperty({
    enum: RequestStatusFilterType,
    required: false,
    isArray: true,
    description: 'Фильтр по категориям статусов (можно указать несколько через запятую)',
    example: 'pending,approved',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map((v) => v.trim());
    return typeof value === 'string' ? value.split(',').map((v) => v.trim()) : [value];
  })
  @IsEnum(RequestStatusFilterType, { each: true })
  category?: RequestStatusFilterType[];

  @ApiProperty({
    enum: FormPaymentDirection,
    required: false,
    isArray: true,
    description: 'Направление платежа (можно указать несколько через запятую)',
    example: 'export,import',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map((v) => v.trim());
    return typeof value === 'string' ? value.split(',').map((v) => v.trim()) : [value];
  })
  @IsEnum(FormPaymentDirection, { each: true })
  direction?: FormPaymentDirection[];

  @ApiProperty({
    enum: AllCurrencies,
    required: false,
    isArray: true,
    description: 'Валюта клиента (можно указать несколько через запятую)',
    example: 'rub,cny',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map((v) => v.trim());
    return typeof value === 'string' ? value.split(',').map((v) => v.trim()) : [value];
  })
  @IsEnum(AllCurrencies, { each: true })
  clientCurrency?: AllCurrencies[];

  @ApiProperty({
    enum: AllCurrencies,
    required: false,
    isArray: true,
    description: 'Валюта контрагента (можно указать несколько через запятую)',
    example: 'usd,eur',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map((v) => v.trim());
    return typeof value === 'string' ? value.split(',').map((v) => v.trim()) : [value];
  })
  @IsEnum(AllCurrencies, { each: true })
  counterpartyCurrency?: AllCurrencies[];

  @ApiProperty({ required: false, description: 'Дата создания заявки (от)', type: Date, example: '2025-01-01' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  dateFrom?: Date;

  @ApiProperty({ required: false, description: 'Дата создания заявки (до)', type: Date, example: '2025-12-31' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  dateTo?: Date;
}

export class ClientOrganizationRequestsPaginateDto
  extends IntersectionType(ClientOrganizationRequestsQueryDto, PaginateDto)
  implements IPaginateOptions {}
