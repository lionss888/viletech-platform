import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';
import { IBaseOptions, IBaseQuery, IBaseService } from 'lib/services/base/base.service.interface';
import { FormPaymentDirection, FormPaymentStatus } from '../../../../lib/enums/models/form-payment.enums';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';

export interface IFormPaymentOneCService extends IBaseService<IFormPayment, IFormPaymentOneCQuery, IBaseOptions> {
  find(findData: IFormPaymentOneCQuery, options?: IBaseOptions): Promise<IPaginateResult<IFormPayment>>;
}

export interface IFormPaymentOneCQuery extends IBaseQuery {
  status?: FormPaymentStatus;
  statuses?: FormPaymentStatus[];
  createDateGte?: Date;
  createDateLt?: Date;
  orderAcceptanceDateGte?: Date;
  orderAcceptanceDateLt?: Date;
  direction?: FormPaymentDirection;
  agentId?: string;
}
