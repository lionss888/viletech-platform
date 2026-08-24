import { ISchema } from '../schema.interface';
import { IFile } from './file.interface';
import { AllCurrencies } from '../../enums/common.enums';

export interface ITreasurerTaskBase {
  // Тип задачи
  type: string;
  // Статус задачи
  status: string;
  // ID клиента
  clientId: string;
  // ID экспортного платежа
  exportPaymentId: string;
  // ID импортного платежа
  importPaymentId: string;
  // Сумма возврата (в валюте контрагента импортной сделки)
  refundAmount: number;
  // Валюта суммы возврата (валюта контрагента импортной сделки)
  refundCurrency?: AllCurrencies;
  // Сумма возврата в рублях (пересчитывается при изменении exchangeRate)
  refundAmountInRubles?: number;
  // Сумма возврата в рублях после вычета всех комиссий (пересчитывается автоматически)
  refundAmountInRublesAfterCommission?: number;
  // Курс обмена
  exchangeRate: number;
  // Дата оплаты провайдером
  paymentByProviderDate: Date;
  // Платежное поручение казначея (сгенерированное)
  treasurerOrder?: string | IFile;
  // Подписанное платежное поручение казначея
  treasurerOrderSigned?: string | IFile;
  // Подтверждение выплаты по экспортной выручке
  exportRevenueConfirmation?: string | IFile;
  // Размер комиссии в процентах
  commissionPercent?: number;
  // Сумма комиссии в рублях (пересчитывается из commissionPercent и refundAmountInRubles)
  commissionAmountInRubles?: number;
  // Валюта дополнительной комиссии (пустая строка означает отсутствие дополнительной комиссии)
  additionalCommissionCurrency?: AllCurrencies | '';
  // Размер дополнительной комиссии
  additionalCommissionAmount?: number;
  // Курс дополнительной комиссии
  additionalCommissionExchangeRate?: number;
  // Сумма дополнительной комиссии в рублях (пересчитывается из additionalCommissionAmount, additionalCommissionCurrency и additionalCommissionExchangeRate)
  additionalCommissionAmountInRubles?: number;
}

export interface ITreasurerTask extends ISchema, ITreasurerTaskBase {}
