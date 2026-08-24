import { Types } from 'mongoose';
import { AllCurrencies } from 'lib/enums/common.enums';

/**
 * Rate source for exchange rates
 */
export type RateSource = 'cbr' | 'openexchange';

/**
 * Flat reward configuration (percent and/or fixed fee)
 */
export interface IAccountRateRewardFlat {
  /**
   * Commission percent in basis points (250 = 2.5%, range: 0-10000)
   */
  feePercentBps?: number;

  /**
   * Fixed commission in client currency, minor units (копейки/центы)
   * Must be >= 0
   */
  feeFixMinor?: number;
}

/**
 * Single tier with threshold and rewards for amounts below/above
 */
export interface IAccountRateRewardTierBlock {
  /**
   * Lower bound (exclusive) for this tier in client currency, minor units
   * Must be > 0. Backend will inject base tier for 0 automatically.
   */
  thresholdMinor: number;

  /**
   * Reward for deals with amount > threshold (until next tier, last tier applies for infinity)
   */
  above?: IAccountRateRewardFlat;
}

/**
 * Reward configuration mode
 */
export interface IAccountRateRewardSettings {
  /**
   * Reward calculation mode
   */
  mode: 'same_for_all' | 'by_amount';

  /**
   * Flat reward (used when mode='same_for_all')
   */
  sameForAll?: IAccountRateRewardFlat;

  /**
   * Tiered rewards (used when mode='by_amount', max 6 tiers)
   * Must be sorted by thresholdMinor ascending
   */
  tiers?: IAccountRateRewardTierBlock[];
}

/**
 * Complete rate settings for an account
 */
export interface IAccountRateSettings {
  /**
   * Currency scope of this rule: 'all' (default) or specific currency code
   */
  currencyScope: 'all' | AllCurrencies;

  /**
   * Source of exchange rates for this client's deals
   */
  rateSource: RateSource;

  /**
   * Agent remuneration configuration
   */
  reward: IAccountRateRewardSettings;

  /**
   * When settings were last updated
   */
  updatedAt: Date;

  /**
   * Who updated the settings (ROOT/ADMIN user ID)
   */
  updatedBy: Types.ObjectId;
}
