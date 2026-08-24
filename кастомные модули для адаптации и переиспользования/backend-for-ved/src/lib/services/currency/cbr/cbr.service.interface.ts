import { IBaseRateService } from '../base-rate/base-rate.interface';

export interface ICbrService extends IBaseRateService {}
export type ICbrResult = {
  Vname: string; // Название валюты
  Vnom: number; // Номинал валюты
  Vcurs: number; // Курс валюты к рублю
  Vcode: string; // Цифровой код валюты (ISO 4217)
  VchCode: string; // Буквенный код валюты (ISO 4217)
};
