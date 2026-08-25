import { IAccountRateRewardFlat } from '../../account/interfaces';
import { AllCurrencies } from 'lib/enums/common.enums';
import { RateValueSource } from 'lib/enums/models/currency.enums';

export interface IFeeFixMeta {
  /**
   * Fixed fee amount in fee currency, minor units.
   */
  amountMinor: number;

  /**
   * Fee currency code (e.g. 'usd', 'eur').
   */
  currency: AllCurrencies;

  /**
   * Exchange rate used to convert fee currency -> client currency.
   * Interpreted as: client per 1 feeCurrency.
   */
  rateToClient: number;

  /**
   * Source of rateToClient.
   */
  rateSource: RateValueSource;
}

/**
 * Result of commission calculation
 */
export interface ICommissionResult {
  /**
   * Percent-based fee in basis points (250 = 2.5%)
   */
  feePercentBps: number;

  /**
   * Fixed fee in client currency, minor units
   */
  feeFixMinor: number;

  /**
   * Total commission amount in minor units
   * Equals: (dealAmount * feePercentBps / 10000) + feeFixMinor
   */
  feeAmountMinor: number;

  /**
   * Metadata for fixed fee conversion (if fixed fee is configured).
   */
  feeFixMeta?: IFeeFixMeta;

  /**
   * Optional: Which tier was applied (for audit/debugging)
   * Undefined for 'same_for_all' mode
   */
  appliedTier?: {
    thresholdMinor: number;
    reward: IAccountRateRewardFlat;
  };
}

/**
 * Internal fee breakdown (before aggregation)
 */
export interface IFeeBreakdown {
  /**
   * Fee from percent component only
   */
  percentFeeMinor: number;

  /**
   * Fee from fixed component only
   */
  fixedFeeMinor: number;

  /**
   * Total fee (percent + fixed)
   */
  totalFeeMinor: number;
}
