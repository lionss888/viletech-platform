import { Injectable, Logger } from '@nestjs/common';
import * as _ from 'lodash';
import { ConfigService } from '@nestjs/config';
import * as soap from 'soap';
import { BaseRateService } from '../base-rate/base-rate.service';
import { ICbrResult, ICbrService } from './cbr.service.interface';
import { HttpService } from '@nestjs/axios';
import { AllCurrencies } from 'lib/enums/common.enums';
import { CurrencySource } from 'lib/enums/models/currency.enums';

@Injectable()
export class CbrService extends BaseRateService implements ICbrService {
  private readonly logger = new Logger(CbrService.name);
  constructor(protected httpService: HttpService, protected configService: ConfigService) {
    super(httpService);
  }

  protected get latestUrl() {
    const url = this.configService.get('currency.cbr.url');
    return url;
  }

  async findOne(symbol: string) {
    const data = await this.find([symbol]);
    return _.get(data, '[0].rate');
  }

  async find(symbols?: string[]) {
    const baseCurrencySymbol = this.configService.get('currency.base');
    const normalizedSymbols = (symbols ?? []).map((symbol) => symbol.toLocaleLowerCase());

    if (!this.latestUrl) {
      return [];
    }

    try {
      const client = await soap.createClientAsync(this.latestUrl);
      const currentDate = new Date();

      const response = await client.GetCursOnDateAsync({ On_date: currentDate.toISOString().split('T')[0] });

      const rates: ICbrResult[] = _.get(response, '[0].GetCursOnDateResult.diffgram.ValuteData.ValuteCursOnDate');
      const baseCurrency = rates.find((rate) => rate.VchCode.toLocaleLowerCase() === baseCurrencySymbol);

      if (!baseCurrency) {
        throw new Error(`Base currency "${baseCurrencySymbol}" not found in CBR rates.`);
      }

      const filteredRates = _.filter(rates, (rate) => _.includes(normalizedSymbols, rate.VchCode.toLocaleLowerCase()));

      const convertedToBase = await this.convertToBase(filteredRates, baseCurrency);

      return _.map(_.entries(convertedToBase), ([symbol, rate]) => ({
        symbol,
        rate,
        timestamp: currentDate.getTime(),
        source: CurrencySource.CBR,
      }));
    } catch (e) {
      this.logger.error(JSON.stringify(e.response?.data || e.message || e));
      return [];
    }
  }

  async convert() {}

  // Конвертация курса к новой базовой валюте
  async convertToBase(rates: ICbrResult[], baseCurrency: ICbrResult): Promise<Record<string, number>> {
    const SCALE_FACTOR = 1e8;

    // Нормализованный курс базовой валюты
    const normalizeBaseCurrencyToRub: number = (baseCurrency.Vcurs * SCALE_FACTOR) / baseCurrency.Vnom;

    const convertedRates: Record<string, number> = {};

    for (const rate of rates) {
      // Нормализованный курс валюты для перевода
      const normalizeRate: number = (rate.Vcurs * SCALE_FACTOR) / rate.Vnom;

      // Конвертируем курс этой валюты к базовой валюте
      convertedRates[rate.VchCode.toLocaleLowerCase()] = normalizeBaseCurrencyToRub / normalizeRate;
    }

    // Добавляем курс для рубля по отношению к базовой валюте
    convertedRates[AllCurrencies.RUB] = Number(baseCurrency.Vcurs);

    // Для базовой валюты курс всегда равен 1
    convertedRates[baseCurrency.VchCode.toLocaleLowerCase()] = 1;

    return convertedRates;
  }
}
