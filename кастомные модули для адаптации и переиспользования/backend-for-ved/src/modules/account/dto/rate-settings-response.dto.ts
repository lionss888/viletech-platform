import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AllCurrencies } from 'lib/enums/common.enums';

/**
 * Flat reward configuration in response
 */
export class AccountRateRewardFlatResponseDto {
  @ApiPropertyOptional({
    description: 'Commission percent in basis points (250 = 2.5%)',
    example: 250,
  })
  feePercentBps?: number;

  @ApiPropertyOptional({
    description: 'Fixed commission in client currency, minor units',
    example: 20000,
  })
  feeFixMinor?: number;
}

/**
 * User info in response (who made the change)
 */
export class UserResponseDto {
  @ApiProperty({
    description: 'User ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com',
  })
  email: string;
}

/**
 * Tier block in response
 */
export class AccountRateRewardTierBlockResponseDto {
  @ApiProperty({
    description: 'Lower bound (exclusive) in client currency, minor units',
    example: 1000000,
  })
  thresholdMinor: number;

  @ApiPropertyOptional({
    description: 'Reward for deals with amount > threshold (until next tier, last tier applies beyond max)',
    type: AccountRateRewardFlatResponseDto,
  })
  above?: AccountRateRewardFlatResponseDto;
}

/**
 * Reward configuration in response
 */
export class AccountRateRewardSettingsResponseDto {
  @ApiProperty({
    enum: ['same_for_all', 'by_amount'],
    description: 'Reward calculation mode',
    example: 'same_for_all',
  })
  mode: 'same_for_all' | 'by_amount';

  @ApiPropertyOptional({
    description: 'Flat reward for all deals (present when mode=same_for_all)',
    type: AccountRateRewardFlatResponseDto,
  })
  sameForAll?: AccountRateRewardFlatResponseDto;

  @ApiPropertyOptional({
    description: 'Tiered rewards (present when mode=by_amount)',
    type: [AccountRateRewardTierBlockResponseDto],
  })
  tiers?: AccountRateRewardTierBlockResponseDto[];
}

/**
 * Response DTO for current rate settings (GET /rate-settings)
 */
export class RateSettingsResponseDto {
  @ApiProperty({
    enum: ['all', ...Object.values(AllCurrencies)],
    description: 'Currency scope of the rule (all or specific currency from AllCurrencies)',
    example: 'all',
  })
  currencyScope: 'all' | AllCurrencies;

  @ApiProperty({
    enum: ['cbr', 'openexchange'],
    description: 'Exchange rate source',
    example: 'cbr',
  })
  rateSource: 'cbr' | 'openexchange';

  @ApiProperty({
    type: AccountRateRewardSettingsResponseDto,
    description: 'Reward configuration',
  })
  reward: AccountRateRewardSettingsResponseDto;

  @ApiProperty({
    type: Date,
    description: 'When settings were last updated',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: UserResponseDto,
    description: 'User who last updated the settings',
  })
  updatedBy: UserResponseDto;
}
