import { ISchema } from '../schema.interface';
import { FormPaymentDirection } from '../../enums/models/form-payment.enums';
import { AllCurrencies } from '../../enums/common.enums';

export type ILiquidityBase = {
  import: LiquidityImportRates;
  export: LiquidityExportRates;
};

export type LiquidityRates = {
  [key in AllCurrencies]: number;
};

export interface LiquidityProviderOrganization {
  name: string;
  id: string;
  amount: number;
  accountNumber: string;
}

// Структура для export/commitments с детализацией по провайдерам (новая структура)
export type LiquidityProviderRates = {
  amount: number; // Сумма по всем провайдерам в этой валюте
  providerOrganization: LiquidityProviderOrganization[]; // Массив провайдеров со счетами
};

// Структура для import с детализацией по агентам
export type LiquidityAgentRates = {
  [agentName: string]: number;
  amount: number; // Сумма по всем агентам в этой валюте
};

export interface LiquidityExportRates {
  [key: string]: LiquidityProviderRates | number; // Валюты или totalAmount
  totalAmount: number; // Общая сумма по всем валютам
}

export interface LiquidityImportRates {
  [key: string]: LiquidityAgentRates | number; // Валюты или totalAmount
  totalAmount: number; // Общая сумма по всем валютам
}

export interface LiquidityCommitmentsRates {
  [key: string]: LiquidityProviderRates | number; // Валюты или totalAmount
  totalAmount: number; // Общая сумма по всем валютам
}

export interface ILiquidity extends ILiquidityBase, ISchema {
  commitments?: LiquidityCommitmentsRates;
}

export type TLiquidityShortBase = {
  [key in FormPaymentDirection]: number;
};

export interface TLiquidityShort extends TLiquidityShortBase, ISchema {}

export interface ILiquidApply {
  direction: FormPaymentDirection;
  currency: AllCurrencies;
  amount: number;
  providerName?: string; // Название провайдера для export
  providerId?: string; // ID провайдера для export
  accountNumber?: string; // Номер счета для export
  agentName?: string; // Название агента для import
  agentId?: string; // ID агента для получения названия (опционально)
}

export interface ILiquidityGlassSideTotal {
  amount: number;
  currency: AllCurrencies;
}

export interface ILiquidityGlassSide {
  currencies: LiquidityRates;
  total: ILiquidityGlassSideTotal;
}

export interface ILiquidityImportGlassSide extends ILiquidityGlassSide {
  agents: LiquidityImportRates;
}

// Структура стакана в ответе API - соответствует структуре в БД
export interface ILiquidityGlass {
  import: ILiquidityImportGlassSide;
  export: LiquidityExportRates;
  commitments: LiquidityCommitmentsRates;
}

export interface ILiquidityConvertSide {
  type: FormPaymentDirection;
  currency: AllCurrencies;
  amount: number;
}

export interface ILiquidityConvert {
  from: ILiquidityConvertSide;
  to: ILiquidityConvertSide;
}
