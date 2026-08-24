import {
  IBaseOptions,
  IBaseQuery,
  IBaseService,
  UpdatePartial,
} from '../../../lib/services/base/base.service.interface';
import { IPayment, IPaymentBase } from '../../../lib/interfaces/models/payment.interface';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import { PaymentEntityType, PaymentFrom } from '../../../lib/enums/models/payment.enums';

export interface IPaymentService
  extends IBaseService<IPayment, IPaymentQuery, IBaseOptions, IPaymentCreate, IPaymentUpdate> {
  createForForm(createData: IPaymentCreateForForm): Promise<void>;

  addPayment(data: IPaymentCreateForForm): Promise<void>;

  addPayments(data: IPaymentCreateForForm[]): Promise<void>;
}

export interface IPaymentQuery extends IBaseQuery {
  entity?: string;
  entityType?: PaymentEntityType;
  organizationInnLength?: number;
  isEntityAssigned?: boolean;
  paymentFrom?: PaymentFrom;
  externalId?: string;
  createDateGte?: Date;
  createDateLt?: Date;
}

export interface IPaymentCreate extends Partial<IPayment> {}

export interface IPaymentUpdate extends UpdatePartial<IPayment> {}

export interface IPaymentCreateForForm
  extends Omit<IPaymentBase, 'entity' | 'entityType' | 'payDate' | 'data' | 'transactionType' | 'status'> {
  id: string;
  organizationInn: string;
  agentInn: string;
  contractAmount: number;
  contractCurrency: AllCurrencies;
  payDate: string;
  formId?: string;
}
