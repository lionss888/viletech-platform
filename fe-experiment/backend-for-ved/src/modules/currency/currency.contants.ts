import { AllCurrencies } from 'lib/enums/common.enums';
import { CurrencyType } from 'lib/enums/models/currency.enums';

export const CURRENCY_CLIENT = 'CURRENCY_CLIENT';

interface ICurrencyDeclineConfig {
  currencyNameCases: [string, string, string];
  fractionalPartNameCases?: [string, string, string];
  currencyNounGender: {
    integer: 0 | 1; // 0 => Мужской род ('один', 'два'...)
    fractionalPart?: 0 | 1; // 1 => Женский род ('одна', 'две'...)
  };
}

export const currencyTextNamesConfig: Record<AllCurrencies, ICurrencyDeclineConfig> = {
  [AllCurrencies.AED]: {
    currencyNameCases: ['дирхам', 'дирхама', 'дирхамов'],
    fractionalPartNameCases: ['филс', 'филса', 'филсов'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.BTC]: {
    currencyNameCases: ['bitcoin', 'bitcoin', 'bitcoin'],
    currencyNounGender: {
      integer: 0,
    },
  },
  [AllCurrencies.CAD]: {
    currencyNameCases: ['канадский доллар', 'канадского доллара', 'канадских долларов'],
    fractionalPartNameCases: ['цент', 'цента', 'центов'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.SGD]: {
    currencyNameCases: ['сингапурский доллар', 'сингапурского доллара', 'сингапурских долларов'],
    fractionalPartNameCases: ['цент', 'цента', 'центов'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.GBP]: {
    currencyNameCases: ['фунт стерлингов', 'фунта стерлингов', 'фунтов стерлингов'],
    fractionalPartNameCases: ['пенни', 'пенса', 'пенсов'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.CNY]: {
    currencyNameCases: ['юань', 'юаня', 'юаней'],
    fractionalPartNameCases: ['фэнь', 'фэня', 'фэней'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.TRY]: {
    currencyNameCases: ['лира', 'лиры', 'лир'],
    fractionalPartNameCases: ['куруш', 'куруша', 'курушей'],
    currencyNounGender: {
      integer: 1,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.ETH]: {
    currencyNameCases: ['ether', 'ether', 'ether'],
    currencyNounGender: {
      integer: 0,
    },
  },
  [AllCurrencies.EUR]: {
    currencyNameCases: ['евро', 'евро', 'евро'],
    fractionalPartNameCases: ['цент', 'цента', 'центов'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.JPY]: {
    currencyNameCases: ['йена', 'йены', 'йен'],
    fractionalPartNameCases: ['сен', 'сена', 'сенов'],
    currencyNounGender: {
      integer: 1,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.RUB]: {
    currencyNameCases: ['рубль', 'рубля', 'рублей'],
    fractionalPartNameCases: ['копейка', 'копейки', 'копеек'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 1,
    },
  },
  [AllCurrencies.USD]: {
    currencyNameCases: ['доллар', 'доллара', 'долларов'],
    fractionalPartNameCases: ['цент', 'цента', 'центов'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.HKD]: {
    currencyNameCases: ['доллар', 'доллара', 'долларов'],
    fractionalPartNameCases: ['цент', 'цента', 'центов'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.INR]: {
    currencyNameCases: ['рупия', 'рупии', 'рупий'],
    fractionalPartNameCases: ['пайса', 'пайсы', 'пайс'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.USDT]: {
    currencyNameCases: ['tether USDT', 'tether USDT', 'tether USDT'],
    currencyNounGender: {
      integer: 0,
    },
  },
  [AllCurrencies.THB]: {
    currencyNameCases: ['бат', 'бата', 'батов'],
    fractionalPartNameCases: ['сатанг', 'сатанга', 'сатангов'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
  [AllCurrencies.CHF]: {
    currencyNameCases: ['франк', 'франка', 'франков'],
    fractionalPartNameCases: ['сантим', 'сантима', 'сантимов'],
    currencyNounGender: {
      integer: 0,
      fractionalPart: 0,
    },
  },
};

export const currencyType: Record<AllCurrencies, CurrencyType> = {
  [AllCurrencies.AED]: CurrencyType.FIAT,
  [AllCurrencies.BTC]: CurrencyType.COIN,
  [AllCurrencies.CNY]: CurrencyType.FIAT,
  [AllCurrencies.TRY]: CurrencyType.FIAT,
  [AllCurrencies.ETH]: CurrencyType.COIN,
  [AllCurrencies.EUR]: CurrencyType.FIAT,
  [AllCurrencies.HKD]: CurrencyType.FIAT,
  [AllCurrencies.INR]: CurrencyType.FIAT,
  [AllCurrencies.JPY]: CurrencyType.FIAT,
  [AllCurrencies.RUB]: CurrencyType.FIAT,
  [AllCurrencies.USD]: CurrencyType.FIAT,
  [AllCurrencies.USDT]: CurrencyType.STABLECOIN,
  [AllCurrencies.CAD]: CurrencyType.FIAT,
  [AllCurrencies.SGD]: CurrencyType.FIAT,
  [AllCurrencies.GBP]: CurrencyType.FIAT,
  [AllCurrencies.THB]: CurrencyType.FIAT,
  [AllCurrencies.CHF]: CurrencyType.FIAT,
};
