import { ISchema } from '../schema.interface';
import { AllCurrencies, CurrencyDirection } from '../../enums/common.enums';
import { CurrencySource, CurrencyType } from 'lib/enums/models/currency.enums';

export interface ICurrencyRate {
  symbol: AllCurrencies;
  rate: number;
}

export interface ICurrencyBase extends ICurrencyRate {
  active: boolean;
  timestamp: number;
  direction: CurrencyDirection;
  source: CurrencySource;
  type: CurrencyType;
}

export interface ICurrency extends ICurrencyBase, ISchema {}

export interface ICurrencyShort extends Pick<ICurrencyBase, 'rate' | 'symbol' | 'source' | 'direction' | 'type'> {}
