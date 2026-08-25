import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from '../../../lib/services/base/base.schema';
import { ITreasurerTask } from '../../../lib/interfaces/models/treasurer-task.interface';
import { AllCurrencies } from '../../../lib/enums/common.enums';
import mongoose from 'mongoose';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'treasurer_tasks',
})
export class TreasurerTask extends BaseSchema implements ITreasurerTask {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  status: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true })
  clientId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true })
  exportPaymentId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true })
  importPaymentId: string;

  @Prop({ required: true })
  refundAmount: number;

  @Prop({ required: false, enum: AllCurrencies })
  refundCurrency?: AllCurrencies;

  @Prop({ required: false })
  refundAmountInRubles?: number;

  @Prop({ required: false })
  refundAmountInRublesAfterCommission?: number;

  @Prop({ required: true })
  exchangeRate: number;

  @Prop({ required: true })
  paymentByProviderDate: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  treasurerOrder?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  treasurerOrderSigned?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  exportRevenueConfirmation?: string;

  @Prop({ required: false })
  commissionPercent?: number;

  @Prop({ required: false })
  commissionAmountInRubles?: number;

  @Prop({ required: false })
  additionalCommissionCurrency?: AllCurrencies | '';

  @Prop({ required: false })
  additionalCommissionAmount?: number;

  @Prop({ required: false })
  additionalCommissionExchangeRate?: number;

  @Prop({ required: false })
  additionalCommissionAmountInRubles?: number;
}

export const TreasurerTaskSchema = SchemaFactory.createForClass(TreasurerTask);
