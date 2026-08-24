import { IAccount } from '../../../lib/interfaces/models/account.interface';
import { ICommissionResult } from '../interfaces/commission-result.interface';
import { RateValueSource } from 'lib/enums/models/currency.enums';

export interface ICommissionCalculationService {
  /**
   * Calculates commission based on account settings and deal amount
   *
   * @param account - Account with rate settings
   * @param dealAmountMinor - Deal amount in client currency, minor units
   * @param clientCurrency - Client currency code (lowercase, e.g. 'rub', 'usd')
   * @param counterpartyCurrency - Counterparty currency code (lowercase)
   * @param rateCounterpartyToClient - Cross-rate: how many client currency units per 1 counterparty unit
   */
  calculateCommission(
    account: IAccount,
    dealAmountMinor: number,
    clientCurrency: string,
    counterpartyCurrency: string,
    rateCounterpartyToClient: number,
    options?: {
      /**
       * Source override for rateCounterpartyToClient (e.g. when manager provided manual rate).
       * When omitted, the source is derived from applicable account rateSettings.
       */
      dealRateSourceOverride?: RateValueSource;
    },
  ): Promise<ICommissionResult>;
}

export const COMMISSION_CALCULATION_SERVICE = 'ICommissionCalculationService';
