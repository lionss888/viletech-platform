import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TreasurerTaskUpdateExchangeRateDto {
  @ApiProperty({ description: 'Новый курс обмена', minimum: 0.0001 })
  @IsNumber()
  @Min(0.0001)
  exchangeRate: number;
}
