import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, ValidateNested, IsOptional } from 'class-validator';
import { BaseDto } from '../base.dto';
import { Type } from 'class-transformer';
import {
  ILiquidity,
  ILiquidityBase,
  LiquidityRates,
  LiquidityExportRates,
  LiquidityCommitmentsRates,
  LiquidityImportRates,
} from '../../interfaces/models/liquidity.interface';

export class ILiquidityValueDto implements LiquidityRates {
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  rub: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  usd: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  cny: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  jpy: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  try: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  hkd: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  inr: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  aed: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  btc: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  eth: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  eur: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  usdt: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  cad: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  sgd: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  gbp: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  thb: number;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  chf: number;
}

export class LiquidityBaseDto implements ILiquidityBase {
  @ApiProperty({ type: Object, description: 'Import rates grouped by agents' })
  @IsOptional()
  import: LiquidityImportRates;

  @ApiProperty({ type: Object, description: 'Export rates with provider details' })
  @IsOptional()
  export: LiquidityExportRates;
}

export class LiquidityDto extends IntersectionType(LiquidityBaseDto, BaseDto) implements ILiquidity {
  @ApiProperty({ type: Object, description: 'Commitments with provider details', required: false })
  @IsOptional()
  commitments?: LiquidityCommitmentsRates;
}
