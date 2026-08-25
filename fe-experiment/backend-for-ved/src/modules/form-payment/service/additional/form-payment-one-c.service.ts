import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, PopulateOptions } from 'mongoose';
import { IFormPaymentQuery } from '../form-payment.service.interface';
import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';
import { BaseService } from 'lib/services/base/base.service';
import { FormPayment } from '../form-payment.schema';
import { IBaseOptions } from 'lib/services/base/base.service.interface';
import { IFormPaymentOneCQuery, IFormPaymentOneCService } from './form-payment-one-c.service.interface';
import { FormPaymentDirection } from 'lib/enums/models/form-payment.enums';

@Injectable()
export class FormPaymentOneCService
  extends BaseService<IFormPayment, FormPayment, IFormPaymentQuery, IBaseOptions>
  implements IFormPaymentOneCService
{
  constructor(@InjectModel(FormPayment.name) readonly model: PaginateModel<FormPayment>) {
    super();
  }

  protected async makeQuery(findData: IFormPaymentOneCQuery) {
    const query: FilterQuery<FormPayment> = {
      direction: {
        $in: [FormPaymentDirection.IMPORT, FormPaymentDirection.EXPORT],
      },
      isSigningOrderSent: true,
    };

    if (findData._id) {
      query._id = findData._id;
    }

    if (findData._ids?.length) {
      query._id = { $in: findData._ids };
    }

    if (findData.status) {
      query.status = findData.status;
    }

    if (findData.statuses?.length) {
      query.status = { $in: findData.statuses };
    }

    if (findData.direction) {
      query.direction = findData.direction;
    }

    if (findData.createDateGte) {
      query.sentDate = { $gte: findData.createDateGte };
    }

    if (findData.createDateLt) {
      query.sentDate = query.createDate
        ? { ...query.createDate, $lt: findData.createDateLt }
        : { $lt: findData.createDateLt };
    }

    if (findData.orderAcceptanceDateGte) {
      query.orderAcceptanceDate = { $gte: findData.orderAcceptanceDateGte };
    }

    if (findData.orderAcceptanceDateGte) {
      query.orderAcceptanceDate = query.orderAcceptanceDate
        ? { ...query.orderAcceptanceDate, $lt: findData.orderAcceptanceDateLt }
        : { $lt: findData.orderAcceptanceDateLt };
    }

    if (findData.agentId) {
      query.agent = findData.agentId;
    }

    return query;
  }

  protected makePopulate(options?: IBaseOptions): PopulateOptions | (PopulateOptions | string)[] {
    const populates = [];
    const includes = options?.include;

    if (includes) {
      if (includes.includes('docs')) {
        populates.push(
          ...[
            'docs.paymentOrder',
            'docs.paymentAdvanceOrder',
            'docs.paymentOrderSigned',
            'docs.report',
            'docs.docxFile',
            'docs.reportSigned',
            'docs.payments',
            'docs.closing',
            'docs.archive',
            'docs.refund',
          ],
        );
      }

      if (includes.includes('invoices')) {
        populates.push({
          path: 'invoices',
          populate: {
            path: 'file',
          },
        });
      }

      if (includes.includes('agent')) {
        populates.push('agent');
      }

      if (includes.includes('organization')) {
        populates.push({
          path: 'organization',
          populate: {
            path: 'organizationCard',
          },
        });
      }

      if (includes.includes('transactions')) {
        populates.push({
          path: 'transactions',
          populate: {
            path: 'account',
            select: '-_id email fullName',
          },
        });
      }

      if (includes.includes('provider')) {
        populates.push({
          path: 'provider',
          select: '-_id email fullName',
        });
      }
    }

    return populates;
  }
}
