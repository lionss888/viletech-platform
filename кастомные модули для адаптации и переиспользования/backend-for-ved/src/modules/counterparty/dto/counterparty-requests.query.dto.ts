import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginateDto } from 'lib/dto/paginate.dto';
import { IPaginateOptions } from 'lib/interfaces/paginate.interface';
import { FormPaymentDirection } from 'lib/enums/models/form-payment.enums';
import { AllCurrencies } from 'lib/enums/common.enums';

export enum CounterpartyRequestStatusFilterType {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  OTHER = 'other',
}

// Helper for parsing array parameters from query string
const parseArrayParam = ({ value }: { value: unknown }) => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.map((v) => String(v).trim());
  return typeof value === 'string' ? value.split(',').map((v) => v.trim()) : [value];
};

export class CounterpartyRequestsQueryDto {
  @ApiProperty({
    enum: CounterpartyRequestStatusFilterType,
    required: false,
    isArray: true,
    description: 'Фильтр по категориям статусов (можно указать несколько через запятую)',
    example: 'pending,approved',
  })
  @IsOptional()
  @Transform(parseArrayParam)
  @IsEnum(CounterpartyRequestStatusFilterType, { each: true })
  category?: CounterpartyRequestStatusFilterType[];

  @ApiProperty({
    enum: FormPaymentDirection,
    required: false,
    isArray: true,
    description: 'Направление платежа (можно указать несколько через запятую)',
    example: 'export,import',
  })
  @IsOptional()
  @Transform(parseArrayParam)
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
  @Transform(parseArrayParam)
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
  @Transform(parseArrayParam)
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

  @ApiProperty({ required: false, description: 'Минимальная сумма платежа', example: 10000 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  amountGte?: number;

  @ApiProperty({ required: false, description: 'Максимальная сумма платежа', example: 500000 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  amountLte?: number;
}

export class CounterpartyRequestsPaginateDto
  extends IntersectionType(CounterpartyRequestsQueryDto, PaginateDto)
  implements IPaginateOptions {}
