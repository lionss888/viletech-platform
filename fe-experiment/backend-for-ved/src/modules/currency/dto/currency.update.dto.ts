import { ICurrencyBase } from 'lib/interfaces/models/currency.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { StringToBoolean } from 'lib/utils/transform.utils';
import { Type } from 'class-transformer';
import { CurrencyAdminQueryDto } from './currency.query.dto';

export class CurrencyUpdateDto implements Partial<ICurrencyBase> {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @StringToBoolean()
  active?: boolean;
}

export class CurrencyRPCUpdateDto {
  @IsNotEmpty()
  @Type(() => CurrencyAdminQueryDto)
  @ValidateNested()
  query: CurrencyAdminQueryDto;

  @IsNotEmpty()
  @Type(() => CurrencyUpdateDto)
  @ValidateNested()
  update: CurrencyUpdateDto;
}
