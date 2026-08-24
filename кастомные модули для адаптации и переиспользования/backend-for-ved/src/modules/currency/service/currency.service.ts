import { BadRequestException, Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel } from 'mongoose';
import {
  ICalculateRateWithBase,
  IConvertResult,
  ICurrenciesWithBorderlineRates,
  ICurrencyConvert,
  ICurrencyCreate,
  ICurrencyFindRateWithBase,
  ICurrencyQuery,
  ICurrencyService,
  ICurrencyWithCorrectedRate,
  IUsdtWithCorrectedRate,
  IExchangeRate,
} from './currency.service.interface';
import { Currency } from './currency.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as _ from 'lodash';
import { currencyType } from '../currency.contants';
import { BaseService } from 'lib/services/base/base.service';
import { ICurrency, ICurrencyShort } from 'lib/interfaces/models/currency.interface';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { AllCurrencies, CurrencyDirection } from 'lib/enums/common.enums';
import { IOpexService } from '../../../lib/services/currency/opex/opex.service.interface';
import { ConfigService } from '@nestjs/config';
import { ICbrService } from 'lib/services/currency/cbr/cbr.service.interface';
import { IBaseRateService } from 'lib/services/currency/base-rate/base-rate.interface';
import { CurrencySource, CurrencyType, RateStrategy } from 'lib/enums/models/currency.enums';
import { RateSource } from '../../../modules/account/interfaces';
import { convertToBase } from 'lib/utils/helpers/currency.helper';
import { plainModelToClassArray } from 'lib/utils/helpers/entity.helper';
import { CurrencyShortDto } from 'lib/dto/models/currency.dto';
import { ISocketMessageData } from '../../../lib/interfaces/models/socket.interface';
import { SocketEventPattern, SocketMessageAction, SocketMessageContext } from '../../../lib/enums/models/socket.enum';
import { ConfigurationPattern } from 'lib/enums/models/configuration.enums';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';

@Injectable()
export class CurrencyService
  extends BaseService<ICurrency, Currency, ICurrencyQuery, IBaseOptions, ICurrencyCreate>
  implements ICurrencyService, OnApplicationBootstrap, OnModuleInit
{
  private readonly logger = new Logger(CurrencyService.name);
  private readonly sourceServices: Record<CurrencySource, IBaseRateService>;
  private readonly allCurrencySymbols = Object.values(AllCurrencies);

  constructor(
    @InjectModel(Currency.name) readonly model: PaginateModel<Currency>,
    @InjectNats() readonly client: NatsClientProxy,
    @Inject('IOpexService') readonly opexService: IOpexService,
    @Inject('ICbrService') readonly cbrService: ICbrService,
    private readonly configService: ConfigService,
  ) {
    super();

    this.sourceServices = {
      [CurrencySource.CBR]: this.cbrService,
      [CurrencySource.OPEN_EXCHANGE]: this.opexService,
    };
  }

  onModuleInit() {
    this.model.syncIndexes();
  }

  async onApplicationBootstrap() {
    try {
      // Удаляем старые типы курсов
      await this.model.deleteMany({ $or: [{ source: { $exists: false } }, { type: { $exists: false } }] });
      const refreshOnStartup = this.configService.get<boolean>('currency.refreshOnStartup') ?? true;
      if (refreshOnStartup) {
        await this.refreshCurrencies();
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  async convert({ amount, fromSymbol, toSymbol, sources, strategy }: ICurrencyConvert): Promise<IConvertResult> {
    const modelRates = await this.model
      .find({
        symbol: { $in: [fromSymbol, toSymbol] },
        ...(sources ? { source: { $in: sources } } : {}),
      })
      .exec();

    const rates = plainModelToClassArray(CurrencyShortDto, modelRates);

    if (fromSymbol === toSymbol) {
      return { amount, rate: 1 };
    }

    // Фильтруем по нужным источникам, если заданы
    const filteredRates = sources?.length ? rates.filter((r) => sources.includes(r.source)) : rates;

    const globalConfig = await this.client.send(ConfigurationPattern.FIND_ONE, {});

    // Группируем по source
    const grouped = _.groupBy(filteredRates, 'source');

    let bestResult: IConvertResult | null = null;

    for (const [source, list] of Object.entries(grouped)) {
      const from = list.find((c) => c.symbol === fromSymbol);
      const to = list.find((c) => c.symbol === toSymbol);
      if (!from || !to) continue;

      let fromCorrected = await this.getCurrencyWithCorrectedRate({ currency: from, strategy, globalConfig });
      let toCorrected = await this.getCurrencyWithCorrectedRate({ currency: to, strategy, globalConfig });

      if (fromCorrected.symbol === AllCurrencies.USDT) {
        fromCorrected = await this.getUsdtWithCorrectedRate({ currency: fromCorrected, globalConfig });
      }
      if (toCorrected.symbol === AllCurrencies.USDT) {
        toCorrected = await this.getUsdtWithCorrectedRate({ currency: toCorrected, globalConfig });
      }

      const rate = toCorrected.rate / fromCorrected.rate;
      const converted = amount * rate;

      const isBetter =
        strategy === RateStrategy.BASE_STRONGER
          ? !bestResult || converted < bestResult.amount
          : !bestResult || converted > bestResult.amount;

      if (isBetter) {
        bestResult = { amount: converted, rate, source: source as CurrencySource };
      }
    }

    if (!bestResult) {
      throw new BadRequestException('No valid conversion sources found');
    }

    return bestResult;
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async updateRatesEvery5Seconds() {
    if (!this.shouldRunCronUpdates(CurrencySource.OPEN_EXCHANGE)) {
      return;
    }
    await this.updateRates(CurrencySource.OPEN_EXCHANGE, true);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateRatesEvery5Minutes() {
    if (!this.shouldRunCronUpdates(CurrencySource.CBR)) {
      return;
    }
    await this.updateRates(CurrencySource.CBR);
  }

  async delete(_id: string) {
    await super.deleteOne({ _id });
  }

  private async updateRates(source: CurrencySource, notify: boolean = false) {
    const currenciesDb = await super.findMany({ source });

    const sourceService = this.sourceServices[source];
    let rates: Awaited<ReturnType<IBaseRateService['find']>>;
    try {
      rates = await sourceService.find(this.allCurrencySymbols);
    } catch (e) {
      const stack = e instanceof Error ? e.stack : String(e);
      this.logger.error(`Failed to fetch rates from '${source}'`, stack);
      return;
    }

    if (!rates?.length) {
      this.logger.warn(`No rates returned from '${source}', skipping DB update.`);
      return;
    }

    // Генерируем USDT
    const usdRate = _.find(rates, (rate) => rate.symbol === AllCurrencies.USD);
    const hasUsdt = rates.some((rate) => rate.symbol === AllCurrencies.USDT);
    if (usdRate && !hasUsdt) {
      rates.push({
        ...usdRate,
        symbol: AllCurrencies.USDT,
      });
    }

    const bulkData = _.map(rates, ({ symbol, rate, timestamp, source }) => {
      let direction = CurrencyDirection.NO;

      const type = currencyType[symbol];

      if (!type) {
        throw new Error(`Type for currency ${symbol} not found`);
      }

      rate = _.includes([CurrencyType.FIAT, CurrencyType.STABLECOIN], type)
        ? Math.round(rate * 1000000) / 10000
        : rate * 100;

      const currencyDb = _.find(currenciesDb, { symbol: symbol as AllCurrencies });

      if (currencyDb && currencyDb.timestamp !== timestamp) {
        if (rate !== currencyDb.rate) {
          let rateDiff = rate;
          let currencyRateDiff = currencyDb.rate;

          if (rate < 99) {
            while (rateDiff < 99) {
              rateDiff *= 10;
              currencyRateDiff *= 10;
            }
          }

          direction =
            Math.round(rateDiff) > Math.round(currencyRateDiff) ? CurrencyDirection.UP : CurrencyDirection.DOWN;
        }
      }

      return {
        updateOne: {
          filter: { symbol, source },
          update: { rate, direction, timestamp, source, type },
          upsert: true,
        },
      };
    });

    if (!bulkData.length) {
      this.logger.warn(`No bulk operations generated for '${source}', skipping DB update.`);
      return;
    }

    await this.model.bulkWrite(bulkData);

    if (notify) {
      await this.sendCurrencyUpdateNotifications();
    }
  }

  async refreshCurrencies() {
    const sources = Object.keys(this.sourceServices) as CurrencySource[];
    const results = await Promise.allSettled(sources.map((source) => this.updateRates(source)));

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        this.logger.error(`Rates refresh failed for '${sources[index]}'`, result.reason);
      }
    }
  }

  private shouldRunCronUpdates(source: CurrencySource): boolean {
    const isDevelopment = this.configService.get<boolean>('isDevelopment') ?? false;
    if (!isDevelopment) {
      return true;
    }

    if (source === CurrencySource.CBR) {
      return this.configService.get<boolean>('currency.cron.cbrInDev') ?? false;
    }

    if (source === CurrencySource.OPEN_EXCHANGE) {
      return this.configService.get<boolean>('currency.cron.openExchangeInDev') ?? false;
    }

    return false;
  }

  /**
   * Fetches latest rate for given currency and source
   * V-51 Phase 3: Support rate source selection (CBR or OpenExchange)
   *
   * @param currencyCode - ISO 4217 code (USD, EUR, etc.)
   * @param source - 'cbr' or 'openexchange'
   * @returns Exchange rate with value and timestamp, or null if unavailable
   */
  async getLatestRate(currencyCode: AllCurrencies, source: RateSource): Promise<IExchangeRate | null> {
    if (!currencyCode || !source) {
      throw new BadRequestException('currencyCode and source are required');
    }

    // Map RateSource format to CurrencySource format
    // 'openexchange' -> 'open-exchange', 'cbr' -> 'cbr'
    const mappedSource = source === 'openexchange' ? 'open-exchange' : source;
    const currencySource = mappedSource as CurrencySource;

    // Query currency by code and source
    const currency = await this.model.findOne({ symbol: currencyCode, source: currencySource }).exec();

    if (!currency) {
      this.logger.warn(`Rate not available for ${currencyCode} from source '${source}'`, { currencyCode, source });
      return null;
    }

    return {
      value: currency.rate,
      updatedAt: currency.updateDate,
      source,
    };
  }

  // Выбираем самые высокие курсы, по одному от источника, или самые низкие, в зависимости от strategy
  async getCurrenciesWithBorderlineRates<T extends ICurrencyShort | CurrencyShortDto>({
    currencies,
    strategy,
    inverse = false,
  }: ICurrenciesWithBorderlineRates<T>): Promise<T[]> {
    const globalConfig = await this.client.send(ConfigurationPattern.FIND_ONE, {});

    const currenciesMap = new Map<string, T[]>();

    for (const currency of [...currencies]) {
      // Корректируем курс
      const modifiedCurrencyRate = await this.getCurrencyWithCorrectedRate({
        currency,
        strategy,
        globalConfig,
      });

      currenciesMap.has(modifiedCurrencyRate.symbol)
        ? currenciesMap.get(modifiedCurrencyRate.symbol)?.push(modifiedCurrencyRate)
        : currenciesMap.set(modifiedCurrencyRate.symbol, [modifiedCurrencyRate]);
    }

    // Выбираем наибольшие или наименьшие значения курса, в зависимости от strategy
    const borderlineRates = _.map(Array.from(currenciesMap.values()), (symbolRates) =>
      strategy === RateStrategy.BASE_STRONGER ? _.maxBy(symbolRates, 'rate') : _.minBy(symbolRates, 'rate'),
    );

    const usdtCurencyIndex = _.findIndex(borderlineRates, (rate) => rate.symbol === AllCurrencies.USDT);

    // Корректируем курс USDT
    if (usdtCurencyIndex >= 0) {
      const correctedUsdtCurrency = await this.getUsdtWithCorrectedRate({
        currency: borderlineRates[usdtCurencyIndex],
        inverse,
        globalConfig,
      });
      borderlineRates[usdtCurencyIndex] = correctedUsdtCurrency;
    }

    return borderlineRates;
  }

  // Корректируем курс open-exchange
  private async getCurrencyWithCorrectedRate<T extends ICurrencyShort | CurrencyShortDto>({
    currency,
    strategy,
    globalConfig,
  }: ICurrencyWithCorrectedRate<T>): Promise<T> {
    const { openExchangeCorrectionPercent } = globalConfig;

    if (_.isNil(openExchangeCorrectionPercent)) {
      throw new BadRequestException('openExchangeCorrectionPercent not found in configuration');
    }

    let correctedRate = currency.rate;

    // Корректируем фиат и стейблкоин в open-exchange
    if (
      _.includes([CurrencySource.OPEN_EXCHANGE], currency.source) &&
      _.includes([CurrencyType.FIAT, CurrencyType.STABLECOIN], currency.type)
    ) {
      correctedRate =
        strategy === RateStrategy.BASE_WEAKER
          ? correctedRate * (1 - openExchangeCorrectionPercent / 100) // уменьшаем
          : correctedRate * (1 + openExchangeCorrectionPercent / 100); // увеличиваем
    }

    return { ...currency, rate: correctedRate };
  }

  // Корректируем курс USDT
  private async getUsdtWithCorrectedRate<T extends ICurrencyShort | CurrencyShortDto>({
    currency,
    inverse = false,
    globalConfig,
  }: IUsdtWithCorrectedRate<T>): Promise<T> {
    const { usdtCorrectionPercent } = globalConfig;

    if (_.isNil(usdtCorrectionPercent)) {
      throw new BadRequestException('usdtCorrectionPercent not found in configuration');
    }

    return {
      ...currency,
      rate: !inverse
        ? currency.rate * (1 - usdtCorrectionPercent / 100) // уменьшаем
        : currency.rate * (1 + usdtCorrectionPercent / 100), // увеличиваем
    };
  }

  // Самые высокие курсы среди всех источников (или самые низкие если inverse = true)
  // inverse = false -> Сколько можно купить за единицу целевой валюты
  // inverse = true -> Сколько целевой валюты можно купить за единицу каждой результирующей валюты
  // strategy - усиление или ослабление базовой валюты согласно коэффициенту
  async findRateWithBase({
    target,
    inverse = false,
    strategy,
    ...findData
  }: ICurrencyFindRateWithBase): Promise<ICurrencyShort[]> {
    // получаем все курсы валют к доллару
    const currencies = await super.findMany(findData);

    return this.calculateRateWithBase({ currencies, target, inverse, strategy });
  }

  private async sendCurrencyUpdateNotifications() {
    const currencies = await super.findMany({});
    const dashboardRates = await this.calculateRateWithBase({
      currencies,
      inverse: true,
      target: AllCurrencies.RUB,
      strategy: RateStrategy.BASE_STRONGER,
    });

    const currencyUpdateNotification: ISocketMessageData<ICurrencyShort[]> = {
      context: SocketMessageContext.CURRENCY,
      action: SocketMessageAction.UPDATE,
      payload: currencies,
    };
    const dashboardRatesUpdateNotification: ISocketMessageData<ICurrencyShort[]> = {
      context: SocketMessageContext.CURRENCY,
      action: SocketMessageAction.UPDATE_DASHBOARD_RATES,
      payload: dashboardRates,
    };

    await this.client.emit(SocketEventPattern.BROADCAST_MANY, [
      currencyUpdateNotification,
      dashboardRatesUpdateNotification,
    ]);
  }

  private async calculateRateWithBase({ currencies, strategy, target, inverse }: ICalculateRateWithBase) {
    // группируем по источнику
    const currenciesBySource: Partial<Record<CurrencySource, ICurrency[]>> = {};

    _.forEach(currencies, (currency) => {
      currenciesBySource[currency.source] = currenciesBySource[currency.source]
        ? [...currenciesBySource[currency.source], currency]
        : [currency];
    });

    const convertedRates: ICurrencyShort[] = [];

    // Конвертируем каждую группу к новой целевой валюте
    for (const source of _.values(CurrencySource)) {
      convertedRates.push(
        ...convertToBase({ currencies: currenciesBySource[source] || [], baseCurrency: target, inverse }),
      );
    }

    // Исключаем из результирующих валют целевую
    const ratesWithoutBase = _.filter(convertedRates, (rate) => rate.symbol !== target);

    // Выбираем самые высокие курсы, по одному от источника, или самые низкие, в зависимости от strategy
    const highestRates = await this.getCurrenciesWithBorderlineRates({
      currencies: ratesWithoutBase,
      strategy,
      inverse,
    });

    return highestRates;
  }

  protected async makeQuery(findData: ICurrencyQuery) {
    const query: FilterQuery<Currency> = {};

    if (findData._id) {
      query._id = findData._id;
    }

    if (findData._ids?.length) {
      query._id = { $in: findData._ids };
    }

    if (findData.symbol) {
      query.symbol = findData.symbol;
    }

    if (findData.symbols) {
      query.symbol = { $in: findData.symbols };
    }

    if (findData.source) {
      query.source = findData.source;
    }

    if (findData.sources) {
      query.source = { $in: findData.sources };
    }

    if (_.isBoolean(findData.active)) {
      query.active = findData.active;
    }

    return query;
  }
}
