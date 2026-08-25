import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, Min, ValidateNested } from 'class-validator';
import { AllCurrencies } from '../../../../lib/enums/common.enums';
import { FormPaymentDirection } from '../../../../lib/enums/models/form-payment.enums';
import { ILiquidityConvert, ILiquidityConvertSide } from '../../../../lib/interfaces/models/liquidity.interface';

export class LiquidityConvertSideDto implements ILiquidityConvertSide {
  @IsEnum(FormPaymentDirection)
  @IsNotEmpty()
  type: FormPaymentDirection;

  @IsEnum(AllCurrencies)
  @IsNotEmpty()
  currency: AllCurrencies;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  @Min(0)
  amount: number;
}

export class LiquidityConvertDto implements ILiquidityConvert {
  @ValidateNested()
  @Type(() => LiquidityConvertSideDto)
  @IsNotEmpty()
  from: LiquidityConvertSideDto;

  @ValidateNested()
  @Type(() => LiquidityConvertSideDto)
  @IsNotEmpty()
  to: LiquidityConvertSideDto;
}
