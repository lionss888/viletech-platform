import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { v4 as uuidv4 } from 'uuid';
import { BaseSchema } from 'lib/services/base/base.schema';
import mongoose from 'mongoose';
import {
  IOrganization,
  IOrganizationRequisites,
  IOrganizationSubaccount,
} from 'lib/interfaces/models/organization.interface';
import {
  OrganizationBusinessFormType,
  OrganizationSignerPositionType,
  OrganizationSubaccountStatusType,
  OrganizationStatus,
  OrganizationType,
} from 'lib/enums/models/organization.enums';
import { IAccount } from 'lib/interfaces/models/account.interface';

@Schema({ _id: false })
export class OrganizationSubaccount implements IOrganizationSubaccount {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: 'Account' })
  account: string | IAccount;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: OrganizationSubaccountStatusType })
  status: OrganizationSubaccountStatusType;

  @Prop({ default: Date.now })
  inviteDate?: Date;
}

export const OrganizationSubaccountSchema = SchemaFactory.createForClass(OrganizationSubaccount);

@Schema({ _id: false })
export class Requisites implements IOrganizationRequisites {
  @Prop({ default: uuidv4, index: true })
  uuid: string;

  @Prop({ required: true, index: true })
  bankName: string;

  @Prop({ required: true, index: true })
  accountNumber: string;

  @Prop({ required: false, index: true, sparse: true })
  swiftCode?: string;

  @Prop({ required: false, index: true, sparse: true })
  bankCountry?: string;

  @Prop({ required: false, index: true, sparse: true })
  bankAddress?: string;

  @Prop({ required: false, index: true, sparse: true })
  bik?: string;

  @Prop({ required: false, index: true, sparse: true })
  corrNumber?: string;
}

export const RequisitesSchema = SchemaFactory.createForClass(Requisites);

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'organizations',
})
export class Organization extends BaseSchema implements IOrganization {
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: false, sparse: true, unique: false, index: true })
  inn?: string;

  @Prop({ required: false, sparse: true, unique: false, index: true })
  ogrn?: string;

  @Prop({ required: false, sparse: true, unique: false, index: true })
  kpp?: string;

  @Prop({ required: false, sparse: true })
  legalAddress?: string;

  @Prop({ required: false, sparse: true })
  fullName?: string;

  @Prop({ required: true, index: true })
  email: string;

  @Prop({ required: true, index: true })
  phone: string;

  @Prop({ required: true })
  signerName: string;

  @Prop({ enum: OrganizationSignerPositionType, required: true, index: true })
  signerPosition: OrganizationSignerPositionType;

  @Prop({ required: false, index: true, sparse: true })
  signerOtherPosition?: string;

  @Prop({ enum: OrganizationType, required: true, index: true, default: OrganizationType.USER })
  type: OrganizationType;

  @Prop({ enum: OrganizationBusinessFormType, required: true, index: true })
  businessForm: OrganizationBusinessFormType;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, sparse: true, ref: 'File' })
  organizationCard?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, index: true, sparse: true, ref: 'Account' })
  account?: string | IAccount;

  @Prop({ type: [OrganizationSubaccountSchema], default: [] })
  subaccounts: OrganizationSubaccount[];

  @Prop({ default: OrganizationStatus.NOT_APPROVED, required: true, enum: OrganizationStatus })
  status: OrganizationStatus;

  @Prop({ required: false })
  isDeleted?: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: false, type: [RequisitesSchema] })
  requisites?: IOrganizationRequisites[];

  @Prop({ type: [String], index: true, default: [] })
  hsCodePrefixes?: string[];

  @Prop({ type: [String], index: true, default: [] })
  hsCodes?: string[];
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
