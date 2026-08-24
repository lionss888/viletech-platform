import { IBaseRateService } from '../base-rate/base-rate.interface';
import { AllCurrencies } from '../../../enums/common.enums';

export interface IOpexService extends IBaseRateService {}
export type IOpexResult = {
  base: string;
  rates: Record<keyof typeof AllCurrencies, number>;
  timestamp: number;
};
