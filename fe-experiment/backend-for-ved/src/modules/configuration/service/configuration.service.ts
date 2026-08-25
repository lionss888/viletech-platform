import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel } from 'mongoose';
import {
  IConfigurationCreate,
  IConfigurationQuery,
  IConfigurationService,
  IConfigurationUpdate,
} from './configuration.service.interface';
import { Configuration } from './configuration.schema';
import { BaseService } from 'lib/services/base/base.service';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { IConfiguration } from 'lib/interfaces/models/configuration.interface';
import { CurrencyPattern } from 'lib/enums/models/currency.enums';
import _ from 'lodash';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';

@Injectable()
export class ConfigurationService
  extends BaseService<IConfiguration, Configuration, IConfigurationQuery, IBaseOptions, IConfigurationCreate>
  implements IConfigurationService
{
  constructor(
    @InjectModel(Configuration.name) readonly model: PaginateModel<Configuration>,
    @InjectNats() readonly client: NatsClientProxy,
  ) {
    super();
  }

  async updateOne(
    findData: IConfigurationQuery,
    updateData: IConfigurationUpdate,
    options?: IBaseOptions,
  ): Promise<IConfiguration> {
    const configuration = await super.findOne({});

    const updatedConfiguration = await super.updateOne(findData, updateData, options);

    // обновляем курсы валют, если изменили процент коррекции USDT
    if (
      !_.isNil(updatedConfiguration.usdtCorrectionPercent) &&
      configuration.usdtCorrectionPercent !== updatedConfiguration.usdtCorrectionPercent
    ) {
      await this.client.send(CurrencyPattern.REFRESH_CURRENCIES, {});
    }

    return updatedConfiguration;
  }
}
