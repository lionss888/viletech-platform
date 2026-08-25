import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import mongoose, { Types } from 'mongoose';
import { IFormPayment } from 'lib/interfaces/models/form-payment.interface';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { CommentEntityType, CommentKind } from 'lib/enums/models/comment.enums';
import { IComment } from 'lib/interfaces/models/comment.interface';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'comments',
})
export class Comment extends BaseSchema implements IComment {
  @Prop({ enum: CommentEntityType, required: true })
  entityType: CommentEntityType;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    refPath: 'entityType',
  })
  entity: string | IFormPayment;

  @Prop({ type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Account' })
  entityAccount: string | IAccount;

  @Prop({ type: mongoose.Schema.Types.ObjectId, index: true, ref: 'Account' })
  account: string | IAccount;

  @Prop({ required: true })
  text: string;

  @Prop({ enum: CommentKind, required: true })
  kind: CommentKind;

  @Prop({ required: true, type: [Types.ObjectId], ref: 'Account', default: [] })
  readBy: Types.ObjectId[];

  @Prop({ required: false })
  editedAt?: Date;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], unique: false, required: false, ref: 'File' })
  files?: string[];
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
