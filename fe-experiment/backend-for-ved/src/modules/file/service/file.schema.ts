import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IFile } from 'lib/interfaces/models/file.interface';
import { IFormPaymentParsedData } from 'lib/interfaces/excel-parser.interface';
import { FileParseStatus } from 'lib/enums/models/file.enums';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'files',
})
export class File extends BaseSchema implements IFile {
  @Prop({ type: mongoose.Schema.Types.ObjectId, sparse: true, index: true })
  account?: string | IAccount;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop()
  salt?: string;

  @Prop({ unique: true, sparse: true })
  path?: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true, default: false, index: true })
  private: boolean;

  @Prop({ type: Object, required: false })
  parsedValue?: IFormPaymentParsedData;

  @Prop({ required: false })
  parseError?: string;

  @Prop({ type: String, enum: Object.values(FileParseStatus), required: false, index: true })
  parseStatus?: FileParseStatus;

  @Prop({ type: String, required: false })
  parseTemplateId?: string;

  @Prop({ required: false })
  lastParsedAt?: Date;
}

export const FileSchema = SchemaFactory.createForClass(File);

/**
 * Составной индекс для запросов типа "найти файлы со статусом pending у конкретного клиента"
 * Без него на 10k+ файлов будет O(n) скан коллекции
 */
FileSchema.index({ account: 1, parseStatus: 1 });
