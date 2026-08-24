import { IExcelMapping } from 'lib/interfaces/excel-parser.interface';

export const TEMPLATE_2_MAPPING: IExcelMapping = {
  cells: {
    I1: 'organizationName', // merged I1:N1 - наименование организации провайдера (SENDER)
    K3: 'totals.coverAmount', // сумма платежа в валюте (AMOUNT AND CURRENCY, row 3!)
    M4: 'currency.counterparty', // валюта платежа (CURRENCY)
    K9: 'counterparty.name', // наименование получателя (BENEFICIARY)
    K13: 'counterparty.address', // адрес получателя (BENEFICIARY ADDRESS)
    K17: 'counterparty.accountNumber', // merged K17:P17 - номер банковского счета (BENEFICIARY ACCOUNT)
    K20: 'counterparty.bankName', // merged K20:P20 - наименование банка получателя (BENEFICIARY BANK)
    K23: 'counterparty.swiftCode', // merged K23:O23 - SWIFT банка получателя (SWIFT)
    J25: 'counterparty.bankAddress', // merged J25:Q26 - адрес банка получателя (BANK ADDRESS)
  },
};
