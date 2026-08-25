import {
  PaymentChargeType,
  PaymentEntityType,
  PaymentFrom,
  PaymentStatus,
  PaymentTransactionType,
} from '../../enums/models/payment.enums';
import { AllCurrencies } from '../../enums/common.enums';
import { ISchema } from '../schema.interface';

export interface IPaymentBase {
  // Дата платежа
  payDate: Date;
  // Тип платежа
  transactionType: PaymentTransactionType;
  // Сумма платежа
  paymentAmount: number;
  // Валюта платежа
  paymentCurrency: AllCurrencies;
  // Тип платежа
  chargeType: PaymentChargeType;
  // Статус платежа
  status: PaymentStatus;
  // Доп информация
  data?: IPaymentData;

  entity?: string;
  entityType: PaymentEntityType;
}

export interface IPaymentData {
  // Внешний идентификатор
  externalId?: string;
  // ИНН организации
  organizationInn?: string;
  // ИНН ?
  agentInn?: string;
  // Сумма платежа в валюте договора
  contractAmount?: number;
  // Валюта договора
  contractCurrency?: AllCurrencies;
  // Откуда
  from?: PaymentFrom;
}

export interface IPayment extends ISchema, IPaymentBase {}
