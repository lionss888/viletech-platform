import { Injectable, Logger } from '@nestjs/common';
import * as _ from 'lodash';
import { ConfigService } from '@nestjs/config';
import { BaseRateService } from '../base-rate/base-rate.service';
import { IOpexResult, IOpexService } from './opex.service.interface';
import { HttpService } from '@nestjs/axios';
import { AllCurrencies } from '../../../enums/common.enums';
import { CurrencySource } from 'lib/enums/models/currency.enums';

@Injectable()
export class OpexService extends BaseRateService implements IOpexService {
  private readonly logger = new Logger(OpexService.name);
  constructor(protected httpService: HttpService, protected configService: ConfigService) {
    super(httpService);
  }

  protected get latestUrl() {
    const url = this.configService.get('currency.opex.url');
    const appId = this.configService.get('currency.opex.appId');
    const base = this.configService.get('currency.base');
    if (!url || !appId || !base) {
      return '';
    }
    return `${url}/latest.json?app_id=${appId}&base=${String(base).toUpperCase()}`;
  }

  async findOne(symbol: string) {
    if (!this.latestUrl) {
      throw new Error('OpenExchange is not configured (missing currency.opex.appId/url/base).');
    }

    const normalizedSymbol = symbol.toUpperCase();
    const data = await this.getData(`${this.latestUrl}&symbols=${normalizedSymbol}`);
    return data.rates[normalizedSymbol];
  }

  async find(symbols?: string[]) {
    if (!this.latestUrl) {
      this.logger.warn('Skipping OpenExchange rates update: provider is not configured.');
      return [];
    }

    const normalizedSymbols = (symbols ?? []).map((symbol) => symbol.toUpperCase());

    try {
      const data: IOpexResult = await this.getData(
        `${this.latestUrl}&symbols=${normalizedSymbols.join(',')}&show_alternative=true`,
      );

      const rates = _.map(_.entries(data.rates), ([symbol, rate]) => ({
        symbol: symbol.toLocaleLowerCase(),
        rate,
        timestamp: data.timestamp,
        source: CurrencySource.OPEN_EXCHANGE,
      }));

      return rates;
    } catch (e) {
      this.logger.error(JSON.stringify(e.response?.data || e.message || e));
      return [];
    }
  }

  async convert(amount: number, from: AllCurrencies, to: AllCurrencies) {
    try {
      const baseUrl = this.configService.get('currency.opex.url');
      const appId = this.configService.get('currency.opex.appId');
      if (!baseUrl || !appId) {
        throw new Error('OpenExchange is not configured (missing currency.opex.appId/url).');
      }
      const url = `${baseUrl}/convert/1/${from}/${to}?app_id=${appId}`;

      const data = await this.getData(url);

      return data.meta;
    } catch (e) {
      this.logger.error(JSON.stringify(e.response?.data || e.message || e));
    }
  }
}
