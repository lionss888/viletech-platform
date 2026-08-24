export enum CurrencyPattern {
  CREATE_MANY = 'payment.currency.create.many',
  FIND_WITH_PAGINATE = 'payment.currency.find',
  FIND_ONE_OR_EXCEPTION = 'payment.currency.find.one.or.exception',
  EXIST = 'payment.currency.exist',
  CONVERT = 'payment.currency.convert',
  UPDATE_MANY = 'payment.currency.update.many',
  FIND_RATE_WITH_BASE = 'payment.currency.find.rate.with.base',
  REFRESH_CURRENCIES = 'payment.currency.refresh.currencies',
}

export enum CurrencySource {
  CBR = 'cbr',
  OPEN_EXCHANGE = 'open-exchange',
}

/**
 * Source of an exchange rate value used in calculations.
 * - 'manual' means the rate was explicitly provided by a manager/user.
 * - 'cbr' / 'open-exchange' means the rate came from the corresponding provider.
 */
export enum RateValueSource {
  CBR = 'cbr',
  OPEN_EXCHANGE = 'open-exchange',
  MANUAL = 'manual',
}

// Ослабление или укрепление базовой валюты
export enum RateStrategy {
  BASE_WEAKER = 'base_weaker', // ослабить базовую валюту
  BASE_STRONGER = 'base_stronger', // усилить базовую валюту
}

// Тип валюты
export enum CurrencyType {
  FIAT = 'fiat',
  COIN = 'coin',
  STABLECOIN = 'stablecoin',
}
