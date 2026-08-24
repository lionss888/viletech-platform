import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';
import { IBaseOptions, IBaseQuery } from 'lib/services/base/base.service.interface';
import { IFormPaymentQuery } from '../form-payment.service.interface';
import { PassThrough } from 'stream';

export interface IGenerateDocsService {
  generateOrder(data: IGenerateOrder);
  generateAgentReport(findData: IFormPaymentQuery, data: IGenerateAgentReport): Promise<IFormPayment>;
  generateFormPayments(findData: IFormPaymentQuery, options?: IBaseOptions): Promise<PassThrough>;
}

export interface IGenerateAgentReport {
  paymentOrderNumber?: string;
  paymentOrderDate?: string;
}

export interface IFormGenerateOrder extends IBaseQuery {}

export interface IGenerateOrder {
  clientOrganization: string;
  organizationName: string;
  signer: string;
  isAdvance: boolean;
  agent?: string;
}

export interface IAgentReportData {
  reportNumber: string;
  reportDate: string;
  agent: {
    name: string;
    director: string;
  };
  principal: {
    name: string;
    director: string;
  };
  payment: {
    amount: number;
    amountInWords: string;
    currency: string;
    counterparty: string;
    convertedAmount: number;
    convertedAmountInWords: string;
    commission: number;
    commissionPercent: number;
  };
  orderNumber: string;
  orderDate: string;
}
