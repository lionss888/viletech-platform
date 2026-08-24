import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IConfigurationUpdate } from '../service/configuration.service.interface';

export class ConfigurationAdminUpdateDto implements IConfigurationUpdate {
  @ApiProperty({
    type: Number,
    description: 'Процент коррекции курса для open-exchange',
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  openExchangeCorrectionPercent?: number;

  @ApiProperty({
    type: Number,
    description: 'Процент коррекции курса для usdt',
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  usdtCorrectionPercent?: number;
}
