import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { IToken } from 'lib/interfaces/models/token.interface';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'tokens',
})
export class Token extends BaseSchema implements IToken {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Account', autopopulate: true, required: true, index: true })
  account: IAccount;

  @Prop({ unique: true, index: true })
  hash: string;

  @Prop({ index: true })
  domain: string;

  @Prop({ index: true })
  userAgent: string;

  @Prop({ index: true })
  ip: string;

  @Prop()
  expires: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);
