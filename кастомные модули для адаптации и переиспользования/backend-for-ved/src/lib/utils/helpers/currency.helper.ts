import { AllCurrencies, CurrencyDirection } from 'lib/enums/common.enums';
import { ICurrency, ICurrencyShort } from 'lib/interfaces/models/currency.interface';

const SCALE_FACTOR = 1e8;

export interface IConvertToBase {
  currencies: ICurrency[];
  baseCurrency: AllCurrencies;
  inverse: boolean;
}

export interface IConvertByRate {
  amount: number;
  rate: number;
}

// Инверсия direction для inverse опции конвертации
const directionMap = {
  [CurrencyDirection.UP]: CurrencyDirection.DOWN,
  [CurrencyDirection.DOWN]: CurrencyDirection.UP,
  [CurrencyDirection.NO]: CurrencyDirection.NO,
};

// Конвертация курса к новой базовой валюте
export const convertToBase = ({ currencies, baseCurrency, inverse = false }: IConvertToBase): ICurrencyShort[] => {
  const newBaseCurrency = currencies.find((currency) => currency.symbol === baseCurrency);

  if (!newBaseCurrency) {
    return [];
  }

  const newBaseRate = newBaseCurrency.rate;

  return currencies.map(({ symbol, rate, source, direction, type }) => {
    const convertedRate = inverse
      ? (newBaseRate * SCALE_FACTOR) / ((rate * SCALE_FACTOR) / 100) // Инвертируем курс
      : (rate * SCALE_FACTOR * 100) / (newBaseRate * SCALE_FACTOR);

    // Корректируем direction в зависимости от inverse
    const adjustedDirection = inverse ? directionMap[direction] : direction;

    return {
      symbol,
      rate: convertedRate,
      source,
      direction: adjustedDirection,
      type,
    };
  });
};

export interface IGetAmountByRate {
  amount: number;
  rate: number;
}

// Получить новую сумму по курсу
export const getAmountByRate = ({ amount, rate }: IGetAmountByRate): number => {
  return (Math.round(amount) * 1e8 * (rate * 1e8)) / 1e18;
};
