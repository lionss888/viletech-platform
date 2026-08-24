import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';
import { IGenerateAgentReport } from '../service/additional/generate-docs.service.interface';

export class GenerateAgentReportDto implements IGenerateAgentReport {
  @ApiProperty({
    description: 'Номер платежного поручения',
    example: '5868584622676108567',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  paymentOrderNumber?: string;

  @ApiProperty({
    description: 'Дата платежного поручения',
    example: '2025-01-16',
    required: false,
  })
  @IsDateString()
  @IsNotEmpty()
  @IsOptional()
  paymentOrderDate?: string;
}
