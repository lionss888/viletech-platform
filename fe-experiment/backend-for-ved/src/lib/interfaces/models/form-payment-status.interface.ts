import { ISchema } from '../schema.interface';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { AccountRole } from 'lib/enums/models/account.enums';
import { IFormPayment } from './form-payment.interface';
import { IAccount } from './account.interface';

export interface IFormPaymentStatus extends ISchema {
  formPaymentId: string | IFormPayment;
  status: FormPaymentStatus;
  accountId?: string | IAccount;
  accountRoles: AccountRole[];
}
