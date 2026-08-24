import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IFormPaymentStatus } from 'lib/interfaces/models/form-payment-status.interface';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { AccountRole } from 'lib/enums/models/account.enums';
import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';
import { IAccount } from 'lib/interfaces/models/account.interface';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: false,
  },
  collection: 'form-payment-statuses',
})
export class FormPaymentStatusSchema extends BaseSchema implements IFormPaymentStatus {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: 'FormPayment' })
  formPaymentId: string | IFormPayment;

  @Prop({ required: true, enum: FormPaymentStatus, index: true })
  status: FormPaymentStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Account' })
  accountId?: string | IAccount;

  @Prop({ type: [String], enum: AccountRole, default: [] })
  accountRoles: AccountRole[];
}

export const FormPaymentStatusSchemaFactory = SchemaFactory.createForClass(FormPaymentStatusSchema);

FormPaymentStatusSchemaFactory.index({ formPaymentId: 1, createDate: -1 });
