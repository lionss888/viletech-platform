import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IExcelMapping } from 'lib/interfaces/excel-parser.interface';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'templates',
})
export class Template extends BaseSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'File' })
  fileId: string;

  @Prop({ type: Object, required: true })
  mapping: IExcelMapping;

  @Prop({ default: true })
  isActive: boolean;
}

export const TemplateSchema = SchemaFactory.createForClass(Template);
