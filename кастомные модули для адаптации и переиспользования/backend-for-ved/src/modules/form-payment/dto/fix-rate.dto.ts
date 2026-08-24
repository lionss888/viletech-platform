import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsNumber, IsOptional } from 'class-validator';
import { AllCurrencies } from 'lib/enums/common.enums';

export class FixRateDto {
  @ApiPropertyOptional({
    description: 'Mode: auto (use account rules) or manual (explicit rate/fees)',
    enum: ['auto', 'manual'],
    default: 'auto',
  })
  @IsOptional()
  @IsIn(['auto', 'manual'])
  mode: 'auto' | 'manual' = 'auto';

  @ApiPropertyOptional({
    description: 'Rate override. For auto mode overrides rate source; for manual required if rate not set in form.',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional({
    description: 'Postpay only: provider payment order date',
    type: Date,
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  payDate?: Date;

  @ApiPropertyOptional({
    description: 'Commission percent in bps (used in manual mode)',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feePercentBps?: number;

  @ApiPropertyOptional({
    description:
      'Fixed commission amount in minor units. If feeFixCurrency is provided, this value is interpreted in that currency; otherwise treated as client-currency fixed fee (legacy).',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feeFixMinor?: number;

  @ApiPropertyOptional({
    description: 'Fixed commission currency code (used in manual mode)',
    enum: AllCurrencies,
  })
  @IsOptional()
  @IsEnum(AllCurrencies)
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  feeFixCurrency?: AllCurrencies;

  @ApiPropertyOptional({
    description:
      'Fixed commission exchange rate (client per 1 feeFixCurrency). If provided, rate source becomes manual.',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  feeFixRate?: number;
}
