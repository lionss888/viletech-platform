import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel } from 'mongoose';
import { BaseService } from 'lib/services/base/base.service';
import { FormPaymentStatusSchema } from './form-payment-status.schema';
import { IFormPaymentStatus } from 'lib/interfaces/models/form-payment-status.interface';
import {
  IFormPaymentStatusService,
  IFormPaymentStatusQuery,
  IFormPaymentStatusCreate,
} from './form-payment-status.service.interface';
import { IBaseOptions } from 'lib/services/base/base.service.interface';

@Injectable()
export class FormPaymentStatusService
  extends BaseService<
    IFormPaymentStatus,
    FormPaymentStatusSchema,
    IFormPaymentStatusQuery,
    IBaseOptions,
    IFormPaymentStatusCreate,
    never
  >
  implements IFormPaymentStatusService
{
  constructor(@InjectModel(FormPaymentStatusSchema.name) readonly model: PaginateModel<FormPaymentStatusSchema>) {
    super();
  }
}
