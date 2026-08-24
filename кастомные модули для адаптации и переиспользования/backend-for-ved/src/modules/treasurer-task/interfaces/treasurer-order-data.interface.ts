/**
 * Данные для шаблона платежного поручения казначея
 * Используется для рендеринга treasurer-order.pug
 */
export interface ITreasurerOrderData {
    // Основная информация из сделки
    orderNumber: string | number;
    orderDate: string;
    clientOrganizationBusinessForm?: string;
    clientOrganizationName: string;
    clientSignerName: string;
    agentOrganizationName: string;
    agentContractNumber: string;
    agentContractDate: string;
    counterpartyName: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    bankName: string;
    swiftCode: string;
    accountNumber: string;

    // Финансовые данные из задачи казначея
    refundAmount: string;
    refundAmountInRubles: string;
    refundAmountInRublesAfterCommission: string;
    exchangeRate: number | null;
    paymentByProviderDate: string;

    // Комиссии
    commissionPercent: number | null;
    commissionAmountInRubles: string;
    additionalCommissionCurrency?: string;
    additionalCommissionAmount: string;
    additionalCommissionExchangeRate: number | null;
    additionalCommissionAmountInRubles: string;

    // Валюты
    refundCurrency: string;
    refundCurrencyIcon: string;
    clientCurrency: string;
    clientCurrencyIcon: string;
}

/**
 * Входные данные для создания PDF
 */
export interface ICreatePdfInput {
    text: string;
}

