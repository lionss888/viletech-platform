import { BaseService } from '../../../lib/services/base/base.service';
import { IPayment } from '../../../lib/interfaces/models/payment.interface';
import { Payment } from './payment.schema';
import { IBaseOptions } from '../../../lib/services/base/base.service.interface';
import {
  IPaymentCreate,
  IPaymentCreateForForm,
  IPaymentQuery,
  IPaymentService,
  IPaymentUpdate,
} from './payment.service.interface';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, PaginateModel, Types } from 'mongoose';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { FormPaymentCondition, FormPaymentPattern, FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { IFormPayment } from '../../../lib/interfaces/models/form-payment.interface';
import {
  PaymentEntityType,
  PaymentChargeType,
  PaymentFrom,
  PaymentPattern,
  PaymentStatus,
  PaymentTransactionType,
} from '../../../lib/enums/models/payment.enums';
import { InjectQueue } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { IPaymentQueueData } from '../queue/payment-queue.processor.interface';
import { Queue } from 'bull';
import _ from 'lodash';

@Injectable()
export class PaymentService
  extends BaseService<IPayment, Payment, IPaymentQuery, IBaseOptions, IPaymentCreate, IPaymentUpdate>
  implements IPaymentService
{
  private logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel(Payment.name) readonly model: PaginateModel<Payment>,
    @InjectQueue(JobQueueName.PAYMENT_QUEUE) private readonly paymentQueue: Queue<IPaymentQueueData>,
    @InjectNats() private readonly client: NatsClientProxy,
  ) {
    super();
  }

  async addPayment(data: IPaymentCreateForForm): Promise<void> {
    await this.paymentQueue.add(PaymentPattern.CREATE_FOR_FORM_PAYMENT, data);
  }

  async addPayments(data: IPaymentCreateForForm[]) {
    this.logger.log(`Adding payments ${data.length}`);
    this.logger.log(data);

    await this.paymentQueue.addBulk(
      data.map((payment) => ({
        name: PaymentPattern.CREATE_FOR_FORM_PAYMENT,
        data: payment,
      })),
    );
  }

  async createForForm(createData: IPaymentCreateForForm): Promise<void> {
    const paymentLookupQuery: IPaymentQuery = {
      externalId: createData.id,
      paymentFrom: PaymentFrom.ONE_C,
    };

    const existedPayment = await super.findOne(paymentLookupQuery);

    this.logger.log('processing createData');
    this.logger.log(createData);

    const entityId = await this.resolveFormPaymentEntityId(createData, existedPayment?.entity);
    if (!entityId) {
      throw new BadRequestException(`Form for external payment ${createData.id} not found`);
    }
    const saveData = this.buildSaveData(createData, entityId);

    if (existedPayment) {
      await this.model.updateOne(
        { _id: existedPayment._id.toString() },
        {
          $set: saveData,
        },
      );
      await this.applyPaymentToForm(entityId, saveData.chargeType, saveData.payDate);
      return;
    }

    const created = await super.create(saveData);

    await this.applyPaymentToForm(entityId, saveData.chargeType, saveData.payDate);
  }

  private async resolveFormPaymentEntityId(
    createData: IPaymentCreateForForm,
    existedEntityId?: string,
  ): Promise<string | undefined> {
    if (existedEntityId) {
      return existedEntityId;
    }

    if (createData.formId) {
      this.logger.log('Form id given');
      const formPayment = await this.client.send<Pick<IFormPayment, '_id'>>(FormPaymentPattern.FIND_ONE, {
        query: {
          _id: createData.formId,
        },
        options: {
          select: '_id',
        },
      });

      if (formPayment?._id) {
        this.logger.log('Form id found, applying');
        return formPayment._id.toString();
      }

      this.logger.warn(`Form id ${createData.formId} not found for payment ${createData.id}`);
    }

    const amountField = createData.chargeType === PaymentChargeType.FEE ? 'feeAmount' : 'coverAmount';
    const candidateForms = await this.client.send<Pick<IFormPayment, '_id'>[]>(FormPaymentPattern.FIND_MANY, {
      query: {
        organizationInn: createData.organizationInn,
        [amountField]: createData.paymentAmount,
        isOrderAccepted: true,
        clientCurrency: createData.paymentCurrency,
        platformPaymentCondition: FormPaymentCondition.POST_PAYMENT,
        statuses: [
          FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
          FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
          FormPaymentStatus.PAYMENT_PROCESSING,
          FormPaymentStatus.PAYMENT_SENT,
        ],
      },
      options: {
        select: '_id',
      },
    });

    if (candidateForms?.length === 1) {
      return candidateForms[0]._id.toString();
    }

    if (candidateForms?.length) {
      this.logger.warn(
        `Multiple candidate forms found for payment ${createData.id}: ${candidateForms.map((form) => form._id).join(', ')}`,
      );
      throw new BadRequestException(`Ambiguous form payment mapping for external payment ${createData.id}`);
    }

    this.logger.warn(`Form for payment ${createData.id} not found by heuristics`);
    return undefined;
  }

  private buildSaveData(createData: IPaymentCreateForForm, entityId?: string) {
    return {
      payDate: new Date(createData.payDate),
      transactionType: PaymentTransactionType.REPLENISHMENT,
      paymentAmount: createData.paymentAmount,
      paymentCurrency: createData.paymentCurrency,
      chargeType: createData.chargeType,
      status: PaymentStatus.SUCCESS,
      data: {
        externalId: createData.id,
        organizationInn: createData.organizationInn,
        agentInn: createData.agentInn,
        contractAmount: createData.contractAmount,
        contractCurrency: createData.contractCurrency,
        from: PaymentFrom.ONE_C,
      },
      entityType: PaymentEntityType.FORM_PAYMENT,
      entity: entityId,
    };
  }

  async makeQuery({
    _ids,
    organizationInnLength,
    isEntityAssigned,
    paymentFrom,
    externalId,
    createDateGte,
    createDateLt,
    ...findData
  }: IPaymentQuery) {
    const query: FilterQuery<Payment> = { ...findData };

    if (_ids?.length) {
      query._id = { $in: _ids };
    }

    if (organizationInnLength) {
      query['data.organizationInn'] = new RegExp(`^[0-9]{${organizationInnLength}}$`);
    }

    if (!_.isNil(isEntityAssigned)) {
      query.entity = { $exists: isEntityAssigned };
    }

    if (paymentFrom) {
      query['data.from'] = paymentFrom;
    }

    if (externalId) {
      query['data.externalId'] = externalId;
    }

    if (createDateGte) {
      query.createDate = query.createDate
        ? {
            ...query.createDate,
            $gte: createDateGte,
          }
        : {
            $gte: createDateGte,
          };
    }

    if (createDateLt) {
      query.createDate = query.createDate
        ? {
            ...query.createDate,
            $lt: createDateLt,
          }
        : {
            $lt: createDateLt,
          };
    }

    return query;
  }

  private async applyPaymentToForm(entityId: string, chargeType: PaymentChargeType, payDate: Date): Promise<void> {
    try {
      const totalAmount = await this.sumPayments(entityId, chargeType);

      await this.client.send<void>(FormPaymentPattern.APPLY_PAYMENT_FROM_PAYMENT_SERVICE, {
        formPaymentId: entityId,
        chargeType,
        payDate,
        totalAmount,
      });
    } catch (error) {
      this.logger.error(`Failed to apply payment to form ${entityId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async sumPayments(entityId: string, chargeType: PaymentChargeType): Promise<number> {
    if (!Types.ObjectId.isValid(entityId)) {
      this.logger.warn(`Skip sumPayments: invalid entity id ${entityId}`);
      return 0;
    }

    const [result] = await this.model
      .aggregate<{ total: number }>([
        {
          $match: {
            entity: new Types.ObjectId(entityId),
            chargeType,
            status: PaymentStatus.SUCCESS,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$paymentAmount' },
          },
        },
      ])
      .exec();

    return result?.total ?? 0;
  }
}
