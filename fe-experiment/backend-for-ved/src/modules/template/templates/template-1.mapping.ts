import { IExcelMapping } from 'lib/interfaces/excel-parser.interface';

export const TEMPLATE_1_MAPPING: IExcelMapping = {
  cells: {
    I2: 'agentRequisites.createDate', // дата поручения = дата создания заявки
    J2: 'agentRequisites.createDate', // срок исполнения (дата создания + 3 дня)
    K2: 'currency.rate', // курс конвертации
    M2: 'totals.feePercent', // % агентского вознаграждения
    N2: 'totals.feeAmount', // сумма агентского вознаграждения
    U2: 'organizationName', // наименование организации провайдера
    AA2: 'counterparty.name', // наименование получателя
    AB2: 'counterparty.address', // адрес получателя
    AC2: 'counterparty.accountNumber', // номер счета получателя
    AD2: 'counterparty.bankName', // наименование банка получателя
    AE2: 'counterparty.swiftCode', // SWIFT банка получателя
    AF2: 'counterparty.bankAddress', // адрес банка получателя
    AI2: 'totals.coverAmount', // сумма платежа в валюте
    AJ2: 'currency.counterparty', // валюта платежа
    AL2: 'invoices.hsCode', // код ТНВЭД
    AR2: 'text', // комментарий для коллекции comments
  },
};
