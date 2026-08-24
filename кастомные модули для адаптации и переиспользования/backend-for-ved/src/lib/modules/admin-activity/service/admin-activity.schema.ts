import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IAdminActivity } from 'lib/interfaces/models/admin-activity.interface';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { HttpMethod } from 'lib/enums/http-method.enums';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'admin-activities',
})
export class AdminActivity extends BaseSchema implements IAdminActivity {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Account' })
  account: string | IAccount;

  @Prop({ required: true })
  path: string;

  @Prop({ type: String, enum: HttpMethod, required: true })
  method: HttpMethod;

  @Prop({ default: {}, type: mongoose.Schema.Types.Mixed })
  params: Object;

  @Prop({ default: {}, type: mongoose.Schema.Types.Mixed })
  query: Object;

  @Prop({ default: {}, type: mongoose.Schema.Types.Mixed })
  body: Object;
}

export const AdminActivitySchema = SchemaFactory.createForClass(AdminActivity);
