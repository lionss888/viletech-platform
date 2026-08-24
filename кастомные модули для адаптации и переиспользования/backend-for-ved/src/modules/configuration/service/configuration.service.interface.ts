import { IBaseOptions, IBaseQuery, IBaseService, OmitBaseSchema } from 'lib/services/base/base.service.interface';
import { IConfiguration, IConfigurationBase } from 'lib/interfaces/models/configuration.interface';

export interface IConfigurationService extends IBaseService<IConfiguration, IConfigurationQuery> {
  updateOne(
    findData: IConfigurationQuery,
    updateData: IConfigurationUpdate,
    options?: IBaseOptions,
  ): Promise<IConfiguration>;
}

export interface IConfigurationCreate extends OmitBaseSchema<IConfiguration> {}

export interface IConfigurationUpdate extends Partial<IConfigurationBase> {}

export interface IConfigurationQuery extends Partial<IConfiguration>, IBaseQuery {}
