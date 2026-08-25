import { ISchema } from '../schema.interface';
import { IVirtualAccount } from './virtual-account.interface';
import { IFormPayment } from './form-payment.interface';

export interface IReservedDealBase {
  formPayment: string | IFormPayment;
  virtualAccount: string | IVirtualAccount;
  reservedDate: Date;
}

export interface IReservedDeal extends IReservedDealBase, ISchema {}

