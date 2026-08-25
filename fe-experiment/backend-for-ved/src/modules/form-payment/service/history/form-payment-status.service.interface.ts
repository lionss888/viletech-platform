import { IBaseOptions, IBaseQuery, IBaseService } from 'lib/services/base/base.service.interface';
import { IFormPaymentStatus } from 'lib/interfaces/models/form-payment-status.interface';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { AccountRole } from 'lib/enums/models/account.enums';

export interface IFormPaymentStatusService
  extends IBaseService<IFormPaymentStatus, IFormPaymentStatusQuery, IBaseOptions, IFormPaymentStatusCreate, never> {}

export interface IFormPaymentStatusQuery extends IBaseQuery {
  formPaymentId?: string;
  status?: FormPaymentStatus;
}

export interface IFormPaymentStatusCreate {
  formPaymentId: string;
  status: FormPaymentStatus;
  accountId?: string;
  accountRoles: AccountRole[];
}
