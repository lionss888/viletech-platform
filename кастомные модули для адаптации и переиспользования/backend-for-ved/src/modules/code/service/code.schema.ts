import { Exclude } from 'class-transformer';
import { IsDate, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import * as _ from 'lodash';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { BaseSchema } from 'lib/services/base/base.schema';
import { createSalt, decrypt, encrypt } from 'lib/utils/helpers/crypto.helper';
import { CodeType } from '../../../lib/enums/models/code.enums';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'codes',
  toJSON: {
    transform: (doc, ret) => _.omit(ret, ['salt', 'hash']),
  },
})
export class Code extends BaseSchema {
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Account' })
  @IsNotEmpty()
  @IsMongoId()
  account: IAccount | string;

  @Prop({ required: true })
  @IsNotEmpty()
  @Exclude()
  salt: string;

  @Prop({ required: true })
  @IsNotEmpty()
  @IsString()
  @Exclude()
  hash: string;

  @Prop({ type: String, required: true, enum: CodeType })
  @IsNotEmpty()
  @IsString()
  @Exclude()
  type: CodeType;

  @Prop({ required: false })
  @IsDate()
  expirationDate?: Date;

  setGeneratedCode: (code: string, staticSalt: string) => void;

  verify: (code: string, staticSalt: string) => boolean;
}

export const CodeSchema = SchemaFactory.createForClass(Code);

CodeSchema.methods.setGeneratedCode = function (code: string, staticSalt: string): void {
  const salt = createSalt();
  this.salt = salt.toString('hex');
  this.hash = encrypt(salt, staticSalt, code);
};

CodeSchema.methods.verify = function (code: string, staticSalt: string): boolean {
  const salt = Buffer.from(this.salt, 'hex');
  return decrypt(salt, staticSalt, this.hash) === code;
};
