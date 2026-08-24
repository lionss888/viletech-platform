import { CurrencySource } from 'lib/enums/models/currency.enums';
import { AllCurrencies } from '../../../enums/common.enums';

export interface IBaseRateService {
  findOneOrException(symbol: string): Promise<number>;

  findOne(symbol: string): Promise<number>;

  find(symbols: string[]): Promise<ISymbolRate[]>;

  convert(amount: number, from: AllCurrencies, to: AllCurrencies);
}

export interface ISymbolRate {
  symbol: string;
  rate: number;
  timestamp: number;
  source: CurrencySource;
}
