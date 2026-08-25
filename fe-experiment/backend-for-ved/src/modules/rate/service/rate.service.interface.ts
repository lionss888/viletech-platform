import { AllCurrencies } from 'lib/enums/common.enums';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { RateValueSource } from 'lib/enums/models/currency.enums';

export interface IResolvedDealRate {
  backendRate: number;
  frontendRate: number;
  rateSource: RateValueSource;
}

export interface IRateService {
  /**
   * Возвращает кросс-курс контрагент → клиент по правилам аккаунта.
   * backendRate — реальный курс (client per 1 counterparty), без масштабирования.
   * frontendRate — значение, которое сохраняется в form.currency.rate и используется
   * при расчёте coverAmount. Для кросс-курса совпадает с backendRate (до 4 знаков
   * после запятой), для сделок в одной валюте всегда равно 1.
   */
  resolveDealRate(params: {
    account: IAccount;
    clientCurrency: AllCurrencies;
    counterpartyCurrency: AllCurrencies;
    overrideRate?: number;
  }): Promise<IResolvedDealRate>;

  /**
   * Считает сумму в валюте клиента по сохранённому frontendRate.
   * frontendRate интерпретируется как реальный курс client per 1 counterparty
   * (без дополнительного масштабирования), допускается точность до 4 знаков
   * после запятой.
   */
  calcCoverAmount(params: { amountMinor: number; frontendRate?: number }): number;
}

export const RATE_SERVICE = 'IRateService';
