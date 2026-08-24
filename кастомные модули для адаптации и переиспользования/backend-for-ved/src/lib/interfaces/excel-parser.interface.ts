import { AllCurrencies } from 'lib/enums/common.enums';
import { FormPaymentCondition, FormPaymentDirection } from 'lib/enums/models/form-payment.enums';
import { ICryptoRequisites } from 'lib/interfaces/crypto-requisites.interface';

export interface IExcelMapping {
  cells: Record<string, string>; // { "A2": "amount", "B2": "currencyClient", ... }
}

export interface IFormPaymentParsedData {
  // Направление и условия
  direction?: FormPaymentDirection;
  paymentCondition?: FormPaymentCondition;
  counterpartyPaymentCondition?: FormPaymentCondition;
  platformPaymentCondition?: FormPaymentCondition;

  // Суммы
  amount?: number; // в копейках (*100)

  // Суммы (totals)
  totals?: {
    coverAmount?: number; // сумма покрытия (в копейках, умножается на 100)
    feePercent?: number; // процент агентского вознаграждения
    feeAmount?: number; // сумма агентского вознаграждения (в копейках, умножается на 100)
  };

  // Валюты
  currencyClient?: AllCurrencies;
  currencyCounterparty?: AllCurrencies;
  clientCryptoRequisites?: ICryptoRequisites;
  counterpartyCryptoRequisites?: ICryptoRequisites;

  // Валюты (currency object)
  currency?: {
    counterparty?: AllCurrencies; // валюта получателя
    rate?: number; // курс конвертации
  };

  // Агент/Провайдер
  organizationName?: string;

  // Получатель (counterparty) - кому мы платим
  counterparty?: {
    name?: string;
    address?: string;
    accountNumber?: string;
    bankName?: string;
    swiftCode?: string;
    bankAddress?: string;
    bankCountry?: string;
    country?: string;
  };

  // Посредник (intermediary) - отдельно от counterparty
  intermediary?: {
    name?: string;
    address?: string;
    accountNumber?: string;
    swiftCode?: string;
    bankName?: string;
    bankAddress?: string;
    bankCountry?: string;
    country?: string;
  };

  // Реквизиты агента
  agentRequisites?: {
    createDate?: string | Date; // дата создания заявки/поручения
  };

  // Инвойсы
  invoices?: {
    hsCode?: string; // код ТНВЭД
  };

  // Комментарии
  text?: string; // текст комментария (временное поле, используется для формирования comment)
  comment?: string; // итоговый комментарий, собранный из нескольких полей
}
