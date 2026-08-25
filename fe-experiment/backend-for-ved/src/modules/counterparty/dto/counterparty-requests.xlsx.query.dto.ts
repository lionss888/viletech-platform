import { IntersectionType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { CounterpartyRequestsQueryDto } from './counterparty-requests.query.dto';

class CounterpartyAmountFilterDto {
  @ApiPropertyOptional({ description: 'Минимальная сумма платежа', example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountGte?: number;

  @ApiPropertyOptional({ description: 'Максимальная сумма платежа', example: 500000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountLte?: number;
}

export class CounterpartyRequestsXlsxQueryDto extends IntersectionType(
  CounterpartyRequestsQueryDto,
  CounterpartyAmountFilterDto,
) {}
