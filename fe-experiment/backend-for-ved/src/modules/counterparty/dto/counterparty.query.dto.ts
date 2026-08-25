import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsNumber, IsEnum, Min } from 'class-validator';
import { CounterpartyApprovalStatus } from 'lib/enums/models/counterparty.enums';

export class CounterpartyPaginateDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page limit', example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class CounterpartyQueryDto extends CounterpartyPaginateDto {
  @ApiPropertyOptional({ description: 'Counterparty name search', example: 'Foreign Ltd' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Counterparty country', example: 'Germany' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ enum: CounterpartyApprovalStatus, description: 'Approval status filter' })
  @IsOptional()
  @IsEnum(CounterpartyApprovalStatus)
  lastApprovalStatus?: CounterpartyApprovalStatus;
}
