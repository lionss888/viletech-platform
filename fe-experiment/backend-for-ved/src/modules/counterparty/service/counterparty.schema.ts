import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseSchema } from 'lib/services/base/base.schema';
import mongoose from 'mongoose';
import {
  ICounterparty,
  ICounterpartyBank,
  ICounterpartyBankAccount,
} from 'lib/interfaces/models/counterparty.interface';
import { CounterpartyType, CounterpartyApprovalStatus } from 'lib/enums/models/counterparty.enums';
import { IAccount } from 'lib/interfaces/models/account.interface';

@Schema({ _id: false })
export class CounterpartyBankAccount implements ICounterpartyBankAccount {
  @Prop({ default: uuidv4, index: true })
  uuid: string;

  @Prop({ required: true, index: true })
  accountNumber: string;

  @Prop({ required: true, index: true })
  currency: string;

  @Prop({ default: false })
  isPrimary: boolean;
}

export const CounterpartyBankAccountSchema = SchemaFactory.createForClass(CounterpartyBankAccount);

@Schema({ _id: false })
export class CounterpartyStatusHistoryItem {
  @Prop({ enum: CounterpartyApprovalStatus, required: true })
  status: CounterpartyApprovalStatus;

  @Prop({ required: true, default: Date.now })
  createDate: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Account' })
  createdBy: string | IAccount;

  @Prop({ required: false })
  comment?: string;
}

export const CounterpartyStatusHistoryItemSchema = SchemaFactory.createForClass(CounterpartyStatusHistoryItem);

@Schema({ _id: false })
export class CounterpartyBank implements ICounterpartyBank {
  @Prop({ default: uuidv4, index: true })
  uuid: string;

  @Prop({ required: true })
  bankName: string;

  @Prop({ required: false, sparse: true })
  swiftCode?: string;

  @Prop({ required: true })
  bankCountry: string;

  @Prop({ required: false })
  bankAddress?: string;

  @Prop({ type: [CounterpartyBankAccountSchema], default: [] })
  accounts: CounterpartyBankAccount[];
}

export const CounterpartyBankSchema = SchemaFactory.createForClass(CounterpartyBank);

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'counterparties',
})
export class Counterparty extends BaseSchema implements ICounterparty {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: 'Account' })
  createdBy: string | IAccount;

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true, index: true })
  country: string;

  @Prop({ required: false, sparse: true, index: true })
  inn?: string;

  @Prop({ required: false, sparse: true })
  ogrn?: string;

  @Prop({ required: false, sparse: true })
  registrationNumber?: string;

  @Prop({ required: false })
  legalAddress?: string;

  @Prop({ enum: CounterpartyType, required: true, index: true })
  type: CounterpartyType;

  @Prop({ type: [CounterpartyBankSchema], default: [] })
  banks: CounterpartyBank[];

  @Prop({ enum: CounterpartyApprovalStatus, required: true, default: CounterpartyApprovalStatus.PENDING })
  lastApprovalStatus: CounterpartyApprovalStatus | null;

  @Prop({ required: false, sparse: true })
  lastApprovalDate: Date | null;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, sparse: true, ref: 'Account' })
  lastApprovedBy?: string | IAccount;

  @Prop({ required: false })
  lastApprovalComment?: string;

  @Prop({ type: [CounterpartyStatusHistoryItemSchema], default: [] })
  statusHistory: CounterpartyStatusHistoryItem[];

  @Prop({ type: [mongoose.Schema.Types.ObjectId], default: [] })
  formPayments: string[];

  @Prop({ default: true })
  isActive: boolean;
}

export const CounterpartySchema = SchemaFactory.createForClass(Counterparty);

// Indexes for unique constraints and query performance
CounterpartySchema.index(
  { createdBy: 1, inn: 1 },
  {
    unique: true,
    partialFilterExpression: { type: CounterpartyType.RUSSIAN },
  },
);
CounterpartySchema.index(
  { createdBy: 1, name: 1, country: 1 },
  {
    unique: true,
    partialFilterExpression: { type: CounterpartyType.FOREIGN },
  },
);
CounterpartySchema.index({ createdBy: 1, isActive: 1 });
CounterpartySchema.index({ 'banks.accounts.accountNumber': 1 });
CounterpartySchema.index({ lastApprovalStatus: 1 });
CounterpartySchema.index({ lastApprovalDate: 1 });
