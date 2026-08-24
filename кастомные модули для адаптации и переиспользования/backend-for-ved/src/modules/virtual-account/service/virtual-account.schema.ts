import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IVirtualAccount } from 'lib/interfaces/models/virtual-account.interface';
import { AllCurrencies } from 'lib/enums/common.enums';
import { VirtualAccountType } from 'lib/enums/models/virtual-account.enums';
import { IAccount } from 'lib/interfaces/models/account.interface';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'virtual_accounts',
})
export class VirtualAccount extends BaseSchema implements IVirtualAccount {
  @Prop({ type: String, required: true, enum: AllCurrencies, index: true })
  currency: AllCurrencies;

  @Prop({ required: true, default: 0, min: 0 })
  available: number;

  @Prop({ required: true, default: 0, min: 0 })
  reserved: number;

  @Prop({ required: true, default: 0, min: 0 })
  totalBalance: number;

  @Prop({ type: String, required: true, enum: VirtualAccountType, index: true })
  type: VirtualAccountType;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Account', index: true })
  account: string | IAccount;
}

export const VirtualAccountSchema = SchemaFactory.createForClass(VirtualAccount);

VirtualAccountSchema.index({ account: 1, currency: 1, type: 1 }, { unique: true });

// Автоматический пересчет общего баланса перед сохранением
VirtualAccountSchema.pre('save', function (next) {
  if (this.isModified('available') || this.isModified('reserved')) {
    this.totalBalance = this.available + this.reserved;
  }
  next();
});
