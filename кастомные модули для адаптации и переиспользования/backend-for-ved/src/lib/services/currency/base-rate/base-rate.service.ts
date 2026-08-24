import { BadRequestException } from '@nestjs/common';
import { ISymbolRate } from './base-rate.interface';
import { HttpService } from '@nestjs/axios';

export abstract class BaseRateService {
  constructor(protected httpService: HttpService) {}

  protected abstract get latestUrl();

  async findOneOrException(symbol: string) {
    const rate = await this.findOne(symbol);

    if (!symbol) {
      throw new BadRequestException('Unknown currency symbol');
    }

    return rate;
  }

  abstract findOne(symbol: string): Promise<number>;

  abstract find(symbols: string[]): Promise<ISymbolRate[]>;

  protected async getData(url: string) {
    const { data } = await this.httpService.get(url).toPromise();
    return data;
  }
}
