import { ISchema } from 'lib/interfaces/schema.interface';

export interface IConfigurationBase {
  openExchangeCorrectionPercent: number;
  usdtCorrectionPercent: number;
}

export interface IConfiguration extends ISchema, IConfigurationBase {}
