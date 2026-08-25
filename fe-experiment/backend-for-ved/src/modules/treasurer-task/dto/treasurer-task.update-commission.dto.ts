import { IsNumber, IsOptional, Min, Max, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AllCurrencies } from '../../../lib/enums/common.enums';

export class TreasurerTaskUpdateCommissionDto {
  @ApiProperty({ description: 'Размер комиссии в процентах', required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @ApiProperty({
    description: 'Валюта дополнительной комиссии (пустая строка означает отсутствие)',
    required: false,
    enum: AllCurrencies,
  })
  @IsOptional()
  @IsString()
  @IsIn([...Object.values(AllCurrencies), ''])
  additionalCommissionCurrency?: AllCurrencies | '';

  @ApiProperty({ description: 'Размер дополнительной комиссии', required: false, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalCommissionAmount?: number;

  @ApiProperty({ description: 'Курс дополнительной комиссии', required: false, minimum: 0.0001 })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  additionalCommissionExchangeRate?: number;
}
