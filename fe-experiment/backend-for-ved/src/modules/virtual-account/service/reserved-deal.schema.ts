import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IReservedDeal } from 'lib/interfaces/models/reserved-deal.interface';
import { IVirtualAccount } from 'lib/interfaces/models/virtual-account.interface';
import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'reserved_deals',
})
export class ReservedDeal extends BaseSchema implements IReservedDeal {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'FormPayment', index: true })
  formPayment: string | IFormPayment;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'VirtualAccount', index: true })
  virtualAccount: string | IVirtualAccount;

  @Prop({ required: true, default: () => new Date() })
  reservedDate: Date;
}

export const ReservedDealSchema = SchemaFactory.createForClass(ReservedDeal);

// Уникальный индекс: одна сделка может быть зарезервирована только один раз для конкретного виртуального счета
ReservedDealSchema.index({ formPayment: 1, virtualAccount: 1 }, { unique: true });

// Индекс для быстрого поиска всех зарезервированных сделок для виртуального счета
ReservedDealSchema.index({ virtualAccount: 1, reservedDate: 1 });

