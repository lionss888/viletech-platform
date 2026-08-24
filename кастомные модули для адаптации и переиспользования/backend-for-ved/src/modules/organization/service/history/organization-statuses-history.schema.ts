import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IOrganizationStatusesHistory } from 'lib/interfaces/models/organization-statuses-history.interface';
import { OrganizationStatus } from 'lib/enums/models/organization.enums';
import { AccountRole } from 'lib/enums/models/account.enums';
import { IOrganization } from 'lib/interfaces/models/organization.interface';
import { IAccount } from 'lib/interfaces/models/account.interface';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: false,
  },
  collection: 'organization-statuses-history',
})
export class OrganizationStatusesHistorySchema extends BaseSchema implements IOrganizationStatusesHistory {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: 'Organization' })
  organizationId: string | IOrganization;

  @Prop({ required: true, enum: OrganizationStatus, index: true })
  status: OrganizationStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'Account' })
  accountId?: string | IAccount;

  @Prop({ type: [String], enum: AccountRole, default: [] })
  accountRoles: AccountRole[];
}

export const OrganizationStatusesHistorySchemaFactory = SchemaFactory.createForClass(OrganizationStatusesHistorySchema);

OrganizationStatusesHistorySchemaFactory.index({ organizationId: 1, createDate: -1 });
