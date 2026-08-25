import { Inject, Injectable, Logger } from '@nestjs/common';
import { IRateService, IResolvedDealRate } from './rate.service.interface';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { AllCurrencies } from 'lib/enums/common.enums';
import { IAccountRateSettings } from '../../account/interfaces';
import { RateNotAvailableException } from '../../currency/service/rate-not-available.exception';
import { CurrencySource, RateStrategy, RateValueSource } from 'lib/enums/models/currency.enums';
import { ICurrencyService } from '../../currency/service/currency.service.interface';

@Injectable()
export class RateService implements IRateService {
  private readonly logger = new Logger(RateService.name);
  /**
   * Точность курсов: до 4 знаков после запятой.
   * backendRate и frontendRate округляются до этого количества знаков.
   */
  private static readonly RATE_PRECISION = 10000;

  constructor(@Inject('ICurrencyService') private readonly currencyService: ICurrencyService) {}

  async resolveDealRate(params: {
    account: IAccount;
    clientCurrency: AllCurrencies;
    counterpartyCurrency: AllCurrencies;
    overrideRate?: number;
  }): Promise<IResolvedDealRate> {
    const { account, clientCurrency, counterpartyCurrency, overrideRate } = params;
    const isCross = clientCurrency !== counterpartyCurrency;
    const roundRate = (rate: number): number =>
      Math.round(rate * RateService.RATE_PRECISION) / RateService.RATE_PRECISION;

    if (overrideRate !== undefined && overrideRate !== null) {
      const backendRate = roundRate(overrideRate);
      const frontendRate = isCross ? backendRate : 1;
      return { backendRate, frontendRate, rateSource: RateValueSource.MANUAL };
    }

    const applicableSettings = this.resolveRateSettingsForCurrency(account, counterpartyCurrency);
    const source = applicableSettings?.rateSource ?? 'openexchange';
    const preferredCurrencySource = source === 'openexchange' ? CurrencySource.OPEN_EXCHANGE : CurrencySource.CBR;

    if (isCross) {
      const tryConvert = async (sourceToTry: CurrencySource) =>
        this.currencyService.convert({
          amount: 1,
          fromSymbol: counterpartyCurrency,
          toSymbol: clientCurrency,
          sources: [sourceToTry],
          strategy: RateStrategy.BASE_WEAKER,
        });

      let conversion: { rate: number };
      let currencySourceUsed = preferredCurrencySource;
      try {
        conversion = await tryConvert(preferredCurrencySource);
      } catch (err) {
        const fallbackSourceUsed =
          preferredCurrencySource === CurrencySource.OPEN_EXCHANGE ? CurrencySource.CBR : CurrencySource.OPEN_EXCHANGE;
        this.logger.warn(
          `Failed to resolve cross rate ${counterpartyCurrency}->${clientCurrency} from ${preferredCurrencySource}, retrying with ${fallbackSourceUsed}`,
        );
        currencySourceUsed = fallbackSourceUsed;
        conversion = await tryConvert(currencySourceUsed);
      }

      const backendRate = roundRate(conversion.rate);
      const frontendRate = backendRate;
      const rateSource =
        currencySourceUsed === CurrencySource.OPEN_EXCHANGE ? RateValueSource.OPEN_EXCHANGE : RateValueSource.CBR;

      this.logger.debug(
        `Resolved cross rate ${counterpartyCurrency} -> ${clientCurrency} from ${currencySourceUsed}: backend=${backendRate}, frontend=${frontendRate}`,
      );

      return { backendRate, frontendRate, rateSource };
    }

    let currencyRate = await this.currencyService.getLatestRate(counterpartyCurrency, source);
    let effectiveSource = source;

    if (!currencyRate) {
      const fallbackSource = source === 'openexchange' ? 'cbr' : 'openexchange';
      this.logger.warn(
        `Failed to resolve same-currency rate ${counterpartyCurrency} from ${source}, retrying with ${fallbackSource}`,
      );
      currencyRate = await this.currencyService.getLatestRate(counterpartyCurrency, fallbackSource);
      effectiveSource = fallbackSource;
    }

    if (!currencyRate) {
      const sourceLabel = effectiveSource === source ? effectiveSource : `${effectiveSource} (fallback from ${source})`;
      throw new RateNotAvailableException(
        `Rate not available for ${counterpartyCurrency} from source '${sourceLabel}'. Please wait for next rate update or contact administrator.`,
        {
          accountId: account._id?.toString?.(),
          currencyCode: counterpartyCurrency,
          source: effectiveSource,
        },
      );
    }

    const backendRate = roundRate(currencyRate.value);
    const frontendRate = 1;
    const rateSource = effectiveSource === 'openexchange' ? RateValueSource.OPEN_EXCHANGE : RateValueSource.CBR;

    this.logger.debug(
      `Resolved same-currency rate ${counterpartyCurrency} from ${effectiveSource}: backend=${backendRate}, frontend=${frontendRate}`,
    );

    return { backendRate, frontendRate, rateSource };
  }

  calcCoverAmount({ amountMinor, frontendRate }: { amountMinor: number; frontendRate?: number }): number {
    const rate = frontendRate && frontendRate > 0 ? frontendRate : 0;
    // frontendRate интерпретируется как реальный курс client per 1 counterparty.
    return Math.round(amountMinor * rate);
  }

  /**
   * Resolves applicable rate settings for given account and currency.
   * Priority:
   * 1. Rule with currencyScope === dealCurrency
   * 2. Rule with currencyScope === 'all'
   * 3. No rule → undefined
   */
  private resolveRateSettingsForCurrency(
    account: IAccount,
    dealCurrency: string | undefined,
  ): IAccountRateSettings | undefined {
    if (!account.rateSettings || !dealCurrency) {
      return undefined;
    }

    const normalized = dealCurrency.toLowerCase();

    const settingsArray: IAccountRateSettings[] = Array.isArray(account.rateSettings)
      ? (account.rateSettings as unknown as IAccountRateSettings[])
      : [account.rateSettings as unknown as IAccountRateSettings];

    // 1. Exact currency match (excluding 'all')
    const exactMatch = settingsArray.find((s) => s.currencyScope !== 'all' && s.currencyScope === normalized);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. Fallback to 'all'
    const allScope = settingsArray.find((s) => s.currencyScope === 'all');
    return allScope;
  }
}
