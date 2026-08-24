import { Inject, Injectable, Logger } from '@nestjs/common';
import { IAccount } from '../../../lib/interfaces/models/account.interface';
import {
  IAccountRateRewardFlat,
  IAccountRateRewardSettings,
  IAccountRateRewardTierBlock,
  IAccountRateSettings,
} from '../../account/interfaces';
import { ICommissionResult, IFeeBreakdown, IFeeFixMeta } from '../interfaces/commission-result.interface';
import { AllCurrencies } from 'lib/enums/common.enums';
import { RateStrategy, CurrencySource, RateValueSource } from 'lib/enums/models/currency.enums';
import { ICurrencyService } from '../../currency/service/currency.service.interface';

@Injectable()
export class CommissionCalculationService {
  private readonly logger = new Logger(CommissionCalculationService.name);

  constructor(@Inject('ICurrencyService') private readonly currencyService: ICurrencyService) {}

  /**
   * Calculates commission for a deal based on account rate settings
   *
   * Algorithm:
   * - If account has no rateSettings → fallback to default
   * - If mode='same_for_all' → apply flat reward
   * - If mode='by_amount' → select tier, apply tier reward
   *
   * @param account - Account with potential rateSettings
   * @param dealAmountMinor - Deal amount in client currency, minor units
   * @param clientCurrency - Client currency code (where fee is paid)
   * @param counterpartyCurrency - Counterparty currency code (rules are keyed by this)
   * @param rateCounterpartyToClient - Cross-rate: how many client currency units per 1 counterparty unit
   * @returns Commission breakdown with applied tier info
   */
  async calculateCommission(
    account: IAccount,
    dealAmountMinor: number,
    clientCurrency: string,
    counterpartyCurrency: string,
    rateCounterpartyToClient: number,
    options?: {
      dealRateSourceOverride?: RateValueSource;
    },
  ): Promise<ICommissionResult> {
    const normalizedClientCurrency = clientCurrency?.toLowerCase?.();
    const normalizedCounterpartyCurrency = counterpartyCurrency?.toLowerCase?.();

    // STEP 1: Resolve applicable rate settings (by counterparty currency with fallback to 'all')
    const settingsArray: IAccountRateSettings[] = Array.isArray(account.rateSettings)
      ? (account.rateSettings as unknown as IAccountRateSettings[])
      : account.rateSettings
      ? [account.rateSettings as unknown as IAccountRateSettings]
      : [];

    const findSpecific = (currency?: string) =>
      settingsArray.find((s) => currency && s.currencyScope !== 'all' && s.currencyScope === currency);
    const findAll = () => settingsArray.find((s) => s.currencyScope === 'all');

    // Приоритет:
    // 1) Спец. правило по валюте контрагента (если есть);
    // 2) Спец. правило по валюте клиента (для export кейсов, когда counterparty-специального нет);
    // 3) Универсальное правило 'all'.
    const applicableSettings =
      findSpecific(normalizedCounterpartyCurrency) ||
      findSpecific(normalizedClientCurrency) ||
      findAll() ||
      this.resolveRateSettingsForCurrency(account, normalizedCounterpartyCurrency);

    if (!applicableSettings) {
      this.logger.debug(
        `Account ${account._id} has no applicable rateSettings for counterparty currency ${normalizedCounterpartyCurrency}, using default commission`,
      );
      return this.calculateDefaultCommission(dealAmountMinor);
    }

    const dealRateSource =
      options?.dealRateSourceOverride ?? this.mapRateSourceToValueSource(applicableSettings.rateSource);

    const rewardConfig: IAccountRateRewardSettings = applicableSettings.reward;

    // STEP 2: Select reward based on mode
    let reward: IAccountRateRewardFlat;
    let appliedTier: { thresholdMinor: number; reward: IAccountRateRewardFlat } | undefined;

    if (rewardConfig.mode === 'same_for_all') {
      reward = rewardConfig.sameForAll!;

      this.logger.debug(
        `Using flat reward for account ${account._id} (counterpartyCurrency=${normalizedCounterpartyCurrency}): ` +
          `${reward.feePercentBps || 0}bps + ${reward.feeFixMinor || 0} minor`,
      );
    } else {
      const normalizedTiers = this.normalizeTiers(rewardConfig.tiers!);

      // 2.1. Сначала восстанавливаем сумму сделки в валюте контрагента (minor)
      const isCross =
        normalizedClientCurrency &&
        normalizedCounterpartyCurrency &&
        normalizedClientCurrency !== normalizedCounterpartyCurrency;

      const dealAmountRounded = Math.round(dealAmountMinor);
      const amountInCounterpartyMinor =
        isCross && rateCounterpartyToClient > 0
          ? Math.round(dealAmountRounded / rateCounterpartyToClient)
          : dealAmountRounded;

      // 2.2. Для scope=all пороги заданы в USD, для
      // currency-specific scope — в валюте контрагента.
      let amountForTier = amountInCounterpartyMinor;

      if (applicableSettings.currencyScope === 'all') {
        if (normalizedCounterpartyCurrency === AllCurrencies.USD) {
          amountForTier = amountInCounterpartyMinor;
        } else if (normalizedCounterpartyCurrency) {
          try {
            const mappedSource = this.mapRateSourceToCurrencySource(applicableSettings.rateSource);

            const { amount: convertedAmount } = await this.currencyService.convert({
              amount: amountInCounterpartyMinor,
              fromSymbol: normalizedCounterpartyCurrency as AllCurrencies,
              toSymbol: AllCurrencies.USD,
              sources: [mappedSource],
              strategy: RateStrategy.BASE_WEAKER,
            });

            amountForTier = Math.round(convertedAmount);

            this.logger.debug(
              `Converted deal amount for tiers from ${normalizedCounterpartyCurrency} to usd: ` +
                `${amountInCounterpartyMinor} -> ${amountForTier}`,
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `Failed to convert deal amount for tiers from ${normalizedCounterpartyCurrency} to usd, ` +
                `falling back to counterparty amount ${amountInCounterpartyMinor}: ${message}`,
            );
            amountForTier = amountInCounterpartyMinor;
          }
        }
      }

      reward = this.selectTier(amountForTier, normalizedTiers);

      // appliedTier for audit
      const tierUsed = this.findAppliedTier(amountForTier, normalizedTiers);
      appliedTier = {
        thresholdMinor: tierUsed.thresholdMinor,
        reward: tierUsed.above!,
      };

      this.logger.debug(
        `Selected tier for account ${account._id}, amount ${dealAmountMinor} (clientCurrency=${normalizedClientCurrency}): ` +
          `threshold ${appliedTier.thresholdMinor}, ` +
          `reward ${reward.feePercentBps || 0}bps + ${reward.feeFixMinor || 0} minor`,
      );
    }

    // STEP 2.1: Map fixed fee to client currency and build audit metadata
    const { rewardInClientCurrency, feeFixMeta } = await this.mapFixedFeeForClientCurrency({
      settings: applicableSettings,
      reward,
      clientCurrency: normalizedClientCurrency as AllCurrencies,
      counterpartyCurrency: normalizedCounterpartyCurrency as AllCurrencies,
      rateCounterpartyToClient,
      dealRateSource,
    });

    // STEP 3: Calculate fee breakdown directly in client currency
    const feeBreakdown = this.calculateFee(dealAmountMinor, rewardInClientCurrency);

    // STEP 4: Return result (all values already in client currency)
    return {
      feePercentBps: rewardInClientCurrency.feePercentBps || 0,
      feeFixMinor: rewardInClientCurrency.feeFixMinor || 0,
      feeAmountMinor: feeBreakdown.totalFeeMinor,
      feeFixMeta,
      appliedTier: appliedTier
        ? {
            ...appliedTier,
            reward: rewardInClientCurrency,
          }
        : undefined,
    };
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

    const settingsArray: IAccountRateSettings[] = Array.isArray(account.rateSettings)
      ? (account.rateSettings as unknown as IAccountRateSettings[])
      : [account.rateSettings as unknown as IAccountRateSettings];

    // 1. Exact currency match (excluding 'all')
    const exactMatch = settingsArray.find((s) => s.currencyScope !== 'all' && s.currencyScope === dealCurrency);
    if (exactMatch) {
      return exactMatch;
    }

    // 2. Fallback to 'all'
    const allScope = settingsArray.find((s) => s.currencyScope === 'all');
    return allScope;
  }

  /**
   * Selects applicable reward tier for given deal amount (tiers are lower bounds, first is 0)
   */
  private selectTier(amount: number, tiers: IAccountRateRewardTierBlock[]): IAccountRateRewardFlat {
    const tier = this.findAppliedTier(amount, tiers);
    if (!tier.above) {
      throw new Error(`Tier with threshold ${tier.thresholdMinor} missing reward`);
    }
    return tier.above;
  }

  /**
   * Calculates total fee from reward configuration
   *
   * Formula:
   *   percentFee = (amountMinor * feePercentBps) / 10000
   *   totalFee = percentFee + feeFixMinor
   *
   * Uses Math.round() for banker's rounding to nearest integer
   *
   * @param amountMinor - Deal amount in minor units
   * @param reward - Reward configuration
   * @returns Fee breakdown
   */
  private calculateFee(amountMinor: number, reward: IAccountRateRewardFlat): IFeeBreakdown {
    const feePercentBps = reward.feePercentBps || 0;
    const feeFixMinor = reward.feeFixMinor || 0;

    // Calculate percent-based fee
    // Example: (3000000 * 250) / 10000 = 75000 (750 RUB = 2.5% of 30,000 RUB)
    const percentFeeMinor = Math.round((amountMinor * feePercentBps) / 10000);

    // Total fee = percent fee + fixed fee
    const totalFeeMinor = percentFeeMinor + feeFixMinor;

    return {
      percentFeeMinor,
      fixedFeeMinor: feeFixMinor,
      totalFeeMinor,
    };
  }

  /**
   * Fallback for accounts without rate settings
   * Uses existing default commission calculation (2.5% default)
   *
   * @param dealAmountMinor - Deal amount in minor units
   * @returns Default commission result
   */
  private calculateDefaultCommission(dealAmountMinor: number): ICommissionResult {
    // Default: 2.5% commission, no fixed fee
    const defaultPercentBps = 250; // 2.5%

    const percentFeeMinor = Math.round((dealAmountMinor * defaultPercentBps) / 10000);

    return {
      feePercentBps: defaultPercentBps,
      feeFixMinor: 0,
      feeAmountMinor: percentFeeMinor,
    };
  }

  /**
   * Maps fixed fee to client currency and returns audit metadata:
   * - currencyScope='all': fixed fee is stored in USD and converted to client currency via rateSource.
   * - currencyScope='<currency>': fixed fee is stored in that currency and converted to client currency only if needed.
   *   If the fee currency equals counterparty currency, we can reuse deal rate (rateCounterpartyToClient).
   */
  private async mapFixedFeeForClientCurrency(params: {
    settings: IAccountRateSettings;
    reward: IAccountRateRewardFlat;
    clientCurrency?: AllCurrencies;
    counterpartyCurrency?: AllCurrencies;
    rateCounterpartyToClient?: number;
    dealRateSource: RateValueSource;
  }): Promise<{ rewardInClientCurrency: IAccountRateRewardFlat; feeFixMeta?: IFeeFixMeta }> {
    const { settings, reward, clientCurrency, counterpartyCurrency, rateCounterpartyToClient, dealRateSource } = params;

    const fixed = reward.feeFixMinor ?? 0;
    if (!fixed || fixed <= 0) {
      return { rewardInClientCurrency: reward };
    }

    const feeCurrency: AllCurrencies =
      settings.currencyScope === 'all' ? AllCurrencies.USD : (settings.currencyScope as AllCurrencies);

    // No conversion needed (or we cannot convert reliably without clientCurrency)
    if (!clientCurrency || feeCurrency === clientCurrency) {
      const feeFixMeta: IFeeFixMeta = {
        amountMinor: fixed,
        currency: feeCurrency,
        rateToClient: 1,
        rateSource: dealRateSource,
      };

      return {
        rewardInClientCurrency: { ...reward, feeFixMinor: Math.round(fixed) },
        feeFixMeta,
      };
    }

    // Prefer deal rate when fee currency equals counterparty currency (keeps manual override consistent)
    if (feeCurrency === counterpartyCurrency && rateCounterpartyToClient && rateCounterpartyToClient > 0) {
      const convertedFixedMinor = Math.round(fixed * rateCounterpartyToClient);
      const feeFixMeta: IFeeFixMeta = {
        amountMinor: fixed,
        currency: feeCurrency,
        rateToClient: rateCounterpartyToClient,
        rateSource: dealRateSource,
      };

      this.logger.debug(
        `Converted fixed fee from ${feeCurrency} to ${clientCurrency} using deal rate: ${fixed} -> ${convertedFixedMinor} minor (rate=${rateCounterpartyToClient}, source=${dealRateSource})`,
      );

      return {
        rewardInClientCurrency: { ...reward, feeFixMinor: convertedFixedMinor },
        feeFixMeta,
      };
    }

    try {
      const preferredSource = this.mapRateValueSourceToCurrencySource(dealRateSource);
      const sources = [preferredSource ?? this.mapRateSourceToCurrencySource(settings.rateSource)];

      const conversion = await this.currencyService.convert({
        amount: fixed,
        fromSymbol: feeCurrency,
        toSymbol: clientCurrency,
        sources,
        strategy: RateStrategy.BASE_WEAKER,
      });

      const roundedRate = this.roundRate(conversion.rate);
      const convertedFixedMinor = Math.round(fixed * roundedRate);
      const rateSource = preferredSource ? dealRateSource : this.mapCurrencySourceToRateValueSource(conversion.source);

      const feeFixMeta: IFeeFixMeta = {
        amountMinor: fixed,
        currency: feeCurrency,
        rateToClient: roundedRate,
        rateSource,
      };

      this.logger.debug(
        `Converted fixed fee from ${feeCurrency} to ${clientCurrency}: ${fixed} -> ${convertedFixedMinor} minor (rate=${roundedRate}, source=${rateSource})`,
      );

      return {
        rewardInClientCurrency: { ...reward, feeFixMinor: convertedFixedMinor },
        feeFixMeta,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to convert fixed fee from ${feeCurrency} to ${clientCurrency}, using original value ${fixed}: ${message}`,
      );

      const feeFixMeta: IFeeFixMeta = {
        amountMinor: fixed,
        currency: feeCurrency,
        rateToClient: 1,
        rateSource: dealRateSource,
      };

      return {
        rewardInClientCurrency: { ...reward, feeFixMinor: Math.round(fixed) },
        feeFixMeta,
      };
    }
  }

  private mapRateSourceToCurrencySource(rateSource: string | undefined): CurrencySource {
    const normalized = typeof rateSource === 'string' ? rateSource.toLowerCase() : undefined;
    if (normalized === 'cbr') {
      return CurrencySource.CBR;
    }
    if (normalized === 'openexchange') {
      return CurrencySource.OPEN_EXCHANGE;
    }
    // Keep defaults aligned with RateService.resolveDealRate fallback.
    return CurrencySource.OPEN_EXCHANGE;
  }

  private mapRateValueSourceToCurrencySource(rateValueSource: RateValueSource): CurrencySource | undefined {
    if (rateValueSource === RateValueSource.OPEN_EXCHANGE) {
      return CurrencySource.OPEN_EXCHANGE;
    }
    if (rateValueSource === RateValueSource.CBR) {
      return CurrencySource.CBR;
    }
    return undefined;
  }

  private mapCurrencySourceToRateValueSource(currencySource: CurrencySource): RateValueSource {
    return currencySource === CurrencySource.OPEN_EXCHANGE ? RateValueSource.OPEN_EXCHANGE : RateValueSource.CBR;
  }

  private mapRateSourceToValueSource(rateSource: string | undefined): RateValueSource {
    const normalized = typeof rateSource === 'string' ? rateSource.toLowerCase() : undefined;
    if (normalized === 'cbr') {
      return RateValueSource.CBR;
    }
    if (normalized === 'openexchange') {
      return RateValueSource.OPEN_EXCHANGE;
    }
    // Keep defaults aligned with RateService.resolveDealRate fallback.
    return RateValueSource.OPEN_EXCHANGE;
  }

  private roundRate(rate: number): number {
    const RATE_PRECISION = 10000;
    return Math.round(rate * RATE_PRECISION) / RATE_PRECISION;
  }

  /**
   * Normalizes tiers to ensure:
   * - sorted by thresholdMinor
   * - base tier at threshold 0
   * - each tier has reward in 'above'
   */
  private normalizeTiers(tiers: IAccountRateRewardTierBlock[]): IAccountRateRewardTierBlock[] {
    if (!tiers || !tiers.length) {
      return [];
    }

    const defaultReward: IAccountRateRewardFlat = { feePercentBps: 0, feeFixMinor: 0 };
    const sorted = [...tiers]
      .map((t) => ({
        thresholdMinor: t.thresholdMinor,
        above: t.above ?? defaultReward,
      }))
      .sort((a, b) => a.thresholdMinor - b.thresholdMinor);

    // Ensure base tier at 0
    if (sorted[0].thresholdMinor > 0) {
      sorted.unshift({
        thresholdMinor: 0,
        above: sorted[0].above ?? defaultReward,
      });
    }

    return sorted;
  }

  private findAppliedTier(amount: number, tiers: IAccountRateRewardTierBlock[]): IAccountRateRewardTierBlock {
    if (!tiers.length) {
      throw new Error('No tiers configured');
    }
    let selected = tiers[0];
    for (const tier of tiers) {
      if (amount >= tier.thresholdMinor) {
        selected = tier;
      } else {
        break;
      }
    }
    return selected;
  }
}
