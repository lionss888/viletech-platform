import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';
import { BaseDto } from '../base.dto';
import { IConfiguration, IConfigurationBase } from 'lib/interfaces/models/configuration.interface';

export class ConfigurationBaseDto implements IConfigurationBase {
  @ApiProperty({ type: Number, description: 'Процент коррекции курса для open-exchange', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  openExchangeCorrectionPercent: number;

  @ApiProperty({ type: Number, description: 'Процент коррекции курса для usdt', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  usdtCorrectionPercent: number;
}

export class ConfigurationDto extends IntersectionType(ConfigurationBaseDto, BaseDto) implements IConfiguration {}
