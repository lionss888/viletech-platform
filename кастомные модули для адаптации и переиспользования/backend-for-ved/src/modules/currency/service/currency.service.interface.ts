import { IBaseService, OmitBaseSchema } from 'lib/services/base/base.service.interface';
import { ICurrency, ICurrencyBase, ICurrencyShort } from 'lib/interfaces/models/currency.interface';
import { IPaginateOptions, IPaginateResult } from 'lib/interfaces/paginate.interface';
import { AllCurrencies } from 'lib/enums/common.enums';
import { CurrencySource, RateStrategy } from 'lib/enums/models/currency.enums';
import { CurrencyShortDto } from 'lib/dto/models/currency.dto';
import { IConfiguration } from 'lib/interfaces/models/configuration.interface';
import { RateSource } from '../../../modules/account/interfaces';

/**
 * Exchange rate from a specific source
 * V-51 Phase 3: Rate lookup by source
 */
export interface IExchangeRate {
  /**
   * Exchange rate value
   */
  value: number;

  /**
   * When this rate was fetched/updated
   */
  updatedAt: Date;

  /**
   * Source of this rate
   */
  source: RateSource;
}

export interface ICurrencyService extends IBaseService<ICurrency, ICurrencyQuery> {
  findOneOrException(findData: ICurrencyQuery): Promise<ICurrency>;

  exist(findData: ICurrencyQuery): Promise<boolean>;

  find(findData: ICurrencyQuery, options?: IPaginateOptions): Promise<IPaginateResult<ICurrency>>;

  updateOne(findData: ICurrencyQuery, updateData: Partial<ICurrencyBase>): Promise<ICurrency>;

  convert(data: ICurrencyConvert): Promise<IConvertResult>;

  findRateWithBase(data: ICurrencyFindRateWithBase): Promise<ICurrencyShort[]>;

  refreshCurrencies(): Promise<void>;

  getCurrenciesWithBorderlineRates<T extends ICurrencyShort | CurrencyShortDto>(
    data: ICurrenciesWithBorderlineRates<T>,
  ): Promise<T[]>;

  /**
   * Fetches latest rate for given currency and source
   * V-51 Phase 3: Support rate source selection (CBR or OpenExchange)
   *
   * @param currencyCode - ISO 4217 code (USD, EUR, etc.) from AllCurrencies enum
   * @param source - 'cbr' or 'openexchange'
   * @returns Exchange rate with value and timestamp, or null if unavailable
   *
   * @throws ValidationException - Invalid parameters
   */
  getLatestRate(currencyCode: AllCurrencies, source: RateSource): Promise<IExchangeRate | null>;
}

export interface ICurrencyCreate extends OmitBaseSchema<ICurrency> {}

export interface ICurrencyQuery extends Partial<ICurrency> {
  _ids?: string[];
  symbol?: AllCurrencies;
  symbols?: AllCurrencies[];
  source?: CurrencySource;
  sources?: CurrencySource[];
}

export interface ICurrencyConvert {
  amount: number;
  fromSymbol: AllCurrencies;
  toSymbol: AllCurrencies;
  sources?: CurrencySource[];
  strategy?: RateStrategy;
}

export interface ICurrencyFindRateWithBase {
  target: AllCurrencies;
  inverse?: boolean;
  strategy: RateStrategy;
  source?: CurrencySource;
  sources?: CurrencySource[];
}

export interface ICurrenciesWithBorderlineRates<T> {
  currencies: T[];
  strategy: RateStrategy;
  inverse?: boolean;
}

export interface ICalculateRateWithBase {
  currencies: ICurrency[];
  target: AllCurrencies;
  inverse?: boolean;
  strategy: RateStrategy;
}
export interface ICurrencyWithCorrectedRate<T> {
  currency: T;
  strategy: RateStrategy;
  globalConfig: IConfiguration;
}
export interface IUsdtWithCorrectedRate<T> {
  currency: T;
  inverse?: boolean;
  globalConfig: IConfiguration;
}

export interface IConvertResult {
  amount: number;
  rate: number;
  source?: CurrencySource;
}
