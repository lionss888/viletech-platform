import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as _ from 'lodash';
import crypto from 'crypto';
import scmp from 'scmp';
import { BadRequestException } from '@nestjs/common';
import { BaseSchema } from 'lib/services/base/base.schema';
import {
  IAccount,
  IAccountTelegram,
  IAccountVerification,
  IAccountVerify,
} from 'lib/interfaces/models/account.interface';
import { AllCurrencies, Lang } from 'lib/enums/common.enums';
import { AccountRole } from '../../../lib/enums/models/account.enums';
import { Requisites, RequisitesSchema } from '../../agent/service/agent.schema';
import mongoose from 'mongoose';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import {
  RateSource,
  IAccountRateRewardFlat,
  IAccountRateRewardTierBlock,
  IAccountRateRewardSettings,
  IAccountRateSettings,
  IAccountRateHistoryEntry,
} from '../interfaces';

@Schema({ _id: false })
export class AccountVerify implements IAccountVerify {
  @Prop()
  lastDate: Date;

  @Prop({ default: 0 })
  count: number;
}

@Schema({ _id: false })
export class AccountVerification implements IAccountVerification {
  @Prop({ default: false, required: true })
  cuv1: boolean;

  @Prop({ default: false, required: true })
  cuv2: boolean;
}

export const AccountVerificationSchema = SchemaFactory.createForClass(AccountVerification);

@Schema({ _id: false })
export class AccountTelegram implements IAccountTelegram {
  @Prop({ required: false })
  username?: string;

  @Prop({ required: false })
  userId?: number;
}

export const AccountTelegramSchema = SchemaFactory.createForClass(AccountTelegram);

@Schema({ _id: false })
export class AccountRateRewardFlat implements IAccountRateRewardFlat {
  @Prop({ type: Number, min: 0, max: 10000 })
  feePercentBps?: number;

  @Prop({ type: Number, min: 0 })
  feeFixMinor?: number;
}

export const AccountRateRewardFlatSchema = SchemaFactory.createForClass(AccountRateRewardFlat);

@Schema({ _id: false })
export class AccountRateRewardTierBlock implements IAccountRateRewardTierBlock {
  // Threshold can be 0 for legacy/base tier data stored in DB.
  // API-level DTOs still enforce >0 thresholds; backend can derive base tier at 0 during calculations.
  @Prop({ type: Number, required: true, min: 0 })
  thresholdMinor: number;

  @Prop({ type: AccountRateRewardFlatSchema })
  above?: AccountRateRewardFlat;
}

export const AccountRateRewardTierBlockSchema = SchemaFactory.createForClass(AccountRateRewardTierBlock);

@Schema({ _id: false })
export class AccountRateRewardSettings implements IAccountRateRewardSettings {
  @Prop({ type: String, enum: ['same_for_all', 'by_amount'], required: true })
  mode: 'same_for_all' | 'by_amount';

  @Prop({ type: AccountRateRewardFlatSchema })
  sameForAll?: AccountRateRewardFlat;

  @Prop({
    type: [AccountRateRewardTierBlockSchema],
    validate: {
      validator: function (tiers: AccountRateRewardTierBlock[]) {
        return !tiers || tiers.length <= 6;
      },
      message: 'Maximum 6 tiers allowed',
    },
  })
  tiers?: AccountRateRewardTierBlock[];
}

export const AccountRateRewardSettingsSchema = SchemaFactory.createForClass(AccountRateRewardSettings);

@Schema({ _id: false })
export class AccountRateSettings implements IAccountRateSettings {
  @Prop({
    type: String,
    enum: ['all', ...Object.values(AllCurrencies)],
    default: 'all',
  })
  currencyScope: 'all' | AllCurrencies;

  @Prop({ type: String, enum: ['cbr', 'openexchange'], required: true })
  rateSource: RateSource;

  @Prop({ type: AccountRateRewardSettingsSchema, required: true })
  reward: AccountRateRewardSettings;

  @Prop({ type: Date, required: true })
  updatedAt: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true })
  updatedBy: mongoose.Types.ObjectId;
}

export const AccountRateSettingsSchema = SchemaFactory.createForClass(AccountRateSettings);

@Schema({ _id: false })
export class AccountRateHistoryEntry implements IAccountRateHistoryEntry {
  @Prop({ type: Date, required: true })
  changedAt: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true })
  changedBy: mongoose.Types.ObjectId;

  @Prop({ type: [AccountRateSettingsSchema], required: false })
  settings: AccountRateSettings[] | null;
}

export const AccountRateHistoryEntrySchema = SchemaFactory.createForClass(AccountRateHistoryEntry);

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'accounts',
  toJSON: {
    transform: (doc, ret) => _.omit(ret, ['salt', 'hash', 'verify']),
  },
})
export class Account extends BaseSchema implements IAccount {
  @Prop({ unique: true, required: true, index: true, lowercase: true })
  email: string;

  @Prop({ required: false, index: true, sparse: true })
  phone?: string;

  @Prop({ trim: true, required: false, maxlength: 152 })
  fullName?: string;

  @Prop({ required: true, default: [AccountRole.USER] })
  roles: AccountRole[];

  @Prop({ required: true, type: [RequisitesSchema] })
  requisites: Requisites[];

  @Prop({ type: [mongoose.Schema.Types.ObjectId], required: false, ref: 'Organization' })
  organizations?: string[] | IOrganization[];

  @Prop({ required: false, min: 0, max: 10000 })
  feePercent?: number; // % умноженный на 100

  @Prop({ type: String, default: Lang.RU, enum: Lang })
  lang: Lang;

  @Prop({ required: false })
  salt?: string;

  @Prop({ required: false })
  externalId?: string;

  @Prop({ required: false })
  hash?: string;

  @Prop({ default: false, required: true })
  active: boolean;

  @Prop({ default: false, required: true })
  confirmed: boolean;

  @Prop({ default: false, required: true })
  blocked: boolean;

  @Prop({ type: AccountVerificationSchema, required: false })
  verification?: AccountVerification;

  @Prop({ default: { count: 0 } })
  verify: AccountVerify;

  @Prop({ required: false, type: AccountTelegramSchema })
  telegram?: IAccountTelegram;

  @Prop({ default: false, required: true })
  enablePostpay: boolean;

  @Prop({ default: false, required: true })
  isCorporateClient: boolean;

  @Prop({ type: [AccountRateSettingsSchema], required: false, default: [] })
  rateSettings?: AccountRateSettings[];

  @Prop({ type: [AccountRateHistoryEntrySchema], default: [] })
  rateHistory?: AccountRateHistoryEntry[];

  setPassword: (password: string) => void;

  changePassword: (oldPassword: string, newPassword: string) => void;

  verifyPassword: (password: string) => boolean;
}

export const AccountSchema = SchemaFactory.createForClass(Account);

// Add indexes for efficient querying
AccountSchema.index({ 'rateSettings.rateSource': 1 });
AccountSchema.index({ 'rateSettings.updatedAt': -1 });
AccountSchema.index({ 'rateHistory.changedAt': -1 });

AccountSchema.methods.setPassword = function (password) {
  if (!password) {
    throw new BadRequestException('Missing password');
  }

  const saltBuffer = crypto.randomBytes(32);
  const salt = saltBuffer.toString('hex');
  const hashRaw: Buffer = crypto.pbkdf2Sync(password, salt, 25000, 512, 'sha256');

  this.salt = salt;
  this.hash = hashRaw.toString('hex');
};

AccountSchema.methods.changePassword = function (oldPassword, newPassword) {
  if (!oldPassword || !newPassword) {
    throw new BadRequestException('Missing password');
  }

  const hashBuffer = crypto.pbkdf2Sync(oldPassword, this.salt, 25000, 512, 'sha256');

  if (!scmp(hashBuffer, Buffer.from(this.hash, 'hex'))) {
    throw new BadRequestException('Incorrect old password');
  }

  this.setPassword(newPassword);
};

AccountSchema.methods.verifyPassword = function (password) {
  const hashBuffer = crypto.pbkdf2Sync(password, this.salt, 25000, 512, 'sha256');
  return scmp(hashBuffer, Buffer.from(this.hash, 'hex'));
};
