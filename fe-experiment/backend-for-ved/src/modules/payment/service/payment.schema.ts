import { BaseSchema } from '../../../lib/services/base/base.schema';
import { IPayment, IPaymentData } from '../../../lib/interfaces/models/payment.interface';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  PaymentChargeType,
  PaymentEntityType,
  PaymentFrom,
  PaymentStatus,
  PaymentTransactionType,
} from '../../../lib/enums/models/payment.enums';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import mongoose from 'mongoose';

@Schema({ _id: false })
class PaymentData implements IPaymentData {
  @Prop({ required: false })
  organizationInn?: string;

  @Prop({ required: false, index: true })
  externalId?: string;

  @Prop({ required: false })
  agentInn?: string;

  @Prop({ required: false })
  counterpartyInn?: string;

  @Prop({ required: false })
  contractAmount?: number;

  @Prop({ required: false, enum: AllCurrencies })
  contractCurrency?: AllCurrencies;

  @Prop({ required: false, enum: PaymentFrom, index: true })
  from?: PaymentFrom;
}

export const PaymentDataSchema = SchemaFactory.createForClass(PaymentData);

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'payments',
})
export class Payment extends BaseSchema implements IPayment {
  @Prop({ required: true })
  payDate: Date;

  @Prop({ required: true, enum: PaymentTransactionType })
  transactionType: PaymentTransactionType;

  @Prop({ required: true })
  paymentAmount: number;

  @Prop({ required: true, enum: AllCurrencies })
  paymentCurrency: AllCurrencies;

  @Prop({ required: true, enum: PaymentChargeType })
  chargeType: PaymentChargeType;

  @Prop({ required: true, enum: PaymentStatus })
  status: PaymentStatus;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    index: true,
    refPath: 'entityType',
  })
  entity?: string;

  @Prop({ required: true, enum: PaymentEntityType })
  entityType: PaymentEntityType;

  @Prop({ required: false, type: PaymentDataSchema })
  data?: IPaymentData;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ 'data.externalId': 1, 'data.from': 1 });
