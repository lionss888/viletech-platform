import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { BaseDto } from '../base.dto';
import { ICurrency, ICurrencyRate } from '../../interfaces/models/currency.interface';
import { AllCurrencies, CurrencyDirection } from '../../enums/common.enums';
import { Exclude } from 'class-transformer';
import { CurrencySource, CurrencyType } from 'lib/enums/models/currency.enums';

export class CurrencyRate implements ICurrencyRate {
  @ApiProperty({ enum: AllCurrencies, enumName: 'Currency' })
  @IsNotEmpty()
  @IsEnum(AllCurrencies)
  symbol: AllCurrencies;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  rate: number;
}

export class CurrencyDto extends IntersectionType(CurrencyRate, BaseDto) implements ICurrency {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  active: boolean;

  @ApiProperty({ enum: CurrencyDirection, enumName: 'CurrencyDirection' })
  @IsNotEmpty()
  @IsEnum(CurrencyDirection)
  direction: CurrencyDirection;

  @Exclude()
  timestamp: number;

  @ApiProperty({ enum: CurrencySource, enumName: 'CurrencySource' })
  @IsNotEmpty()
  @IsEnum(CurrencySource)
  source: CurrencySource;

  @ApiProperty({ enum: CurrencyType, enumName: 'CurrencyType' })
  @IsNotEmpty()
  @IsEnum(CurrencyType)
  type: CurrencyType;
}

export class CurrencyShortDto extends PickType(CurrencyDto, ['rate', 'symbol', 'source', 'type'] as const) {}
