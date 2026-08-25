import { ICurrencyConvert } from '../service/currency.service.interface';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { AllCurrencies } from 'lib/enums/common.enums';
import { CurrencySource } from 'lib/enums/models/currency.enums';

export class CurrencyRPCConvertDto implements ICurrencyConvert {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  @IsEnum(AllCurrencies)
  fromSymbol: AllCurrencies;

  @IsNotEmpty()
  @IsEnum(AllCurrencies)
  toSymbol: AllCurrencies;

  @IsOptional()
  @IsEnum(CurrencySource, { each: true })
  sources: CurrencySource[];
}
