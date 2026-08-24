import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
  ArrayMaxSize,
  Validate,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TiersSortedValidator,
  NoDuplicateThresholdsValidator,
  LastTierHasAboveValidator,
} from '../validators';
import { AllCurrencies } from 'lib/enums/common.enums';

/**
 * Flat reward configuration DTO
 * Represents commission as percent and/or fixed fee
 */
export class AccountRateRewardFlatDto {
  @ApiPropertyOptional({
    description: 'Commission percent in basis points (250 = 2.5%, range: 0-10000)',
    minimum: 0,
    maximum: 10000,
    example: 250,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  feePercentBps?: number;

  @ApiPropertyOptional({
    description: 'Fixed commission in client currency, minor units (копейки/центы)',
    minimum: 0,
    example: 20000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  feeFixMinor?: number;
}

/**
 * Tier block configuration DTO
 * Represents a threshold level with different rewards for amounts below/above
 */
export class AccountRateRewardTierBlockDto {
  @ApiProperty({
    description: 'Lower bound (exclusive) in client currency, minor units (must be >= 0 and unique)',
    minimum: 0,
    example: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  thresholdMinor: number;

  @ApiPropertyOptional({
    description: 'Reward for deals with amount > threshold (required). Backend derives base tier from first entry.',
    type: AccountRateRewardFlatDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountRateRewardFlatDto)
  above?: AccountRateRewardFlatDto;
}

/**
 * DTO for updating account rate settings
 * Supports two reward modes:
 * - same_for_all: Single flat reward for all deals
 * - by_amount: Tiered rewards based on deal amount
 */
export class UpdateRateSettingsDto {
  @ApiProperty({
    description: 'Currency scope: all (default) or specific currency code from AllCurrencies',
    enum: ['all', ...Object.values(AllCurrencies)],
    example: 'all',
    default: 'all',
  })
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @IsIn(['all', ...Object.values(AllCurrencies)], {
    message: 'currencyScope must be "all" or one of supported currencies',
  })
  currencyScope: 'all' | AllCurrencies = 'all';

  @ApiProperty({
    description: 'Exchange rate source',
    enum: ['cbr', 'openexchange'],
    example: 'cbr',
  })
  @IsNotEmpty()
  @IsEnum(['cbr', 'openexchange'], {
    message: 'rateSource must be either "cbr" or "openexchange"',
  })
  rateSource: 'cbr' | 'openexchange';

  @ApiProperty({
    description: 'Reward calculation mode',
    enum: ['same_for_all', 'by_amount'],
    example: 'same_for_all',
  })
  @IsNotEmpty()
  @IsEnum(['same_for_all', 'by_amount'], {
    message: 'rewardMode must be either "same_for_all" or "by_amount"',
  })
  rewardMode: 'same_for_all' | 'by_amount';

  @ApiPropertyOptional({
    description: 'Flat reward for all deals (required if rewardMode=same_for_all)',
    type: AccountRateRewardFlatDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountRateRewardFlatDto)
  sameForAll?: AccountRateRewardFlatDto;

  @ApiPropertyOptional({
    description:
      'Tiered rewards by amount (required if rewardMode=by_amount, max 6 tiers). Must be sorted by thresholdMinor in ascending order.',
    type: [AccountRateRewardTierBlockDto],
    maxItems: 6,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AccountRateRewardTierBlockDto)
  @ArrayMaxSize(6, { message: 'Maximum 6 tiers allowed' })
  @Validate(TiersSortedValidator, {
    message: 'Tiers must be sorted by thresholdMinor in ascending order',
  })
  @Validate(NoDuplicateThresholdsValidator, {
    message: 'Duplicate thresholds are not allowed',
  })
  @Validate(LastTierHasAboveValidator, {
    message: 'Last tier must have "above" reward defined for amounts exceeding all thresholds',
  })
  tiers?: AccountRateRewardTierBlockDto[];
}
