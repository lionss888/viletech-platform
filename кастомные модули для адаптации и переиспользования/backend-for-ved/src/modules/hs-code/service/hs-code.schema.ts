import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IHsCode } from 'lib/interfaces/models/hs-code.interface';
import { HsCodeLoyalty } from 'lib/enums/models/hs-code.enums';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'hs-codes',
})
export class HsCode extends BaseSchema implements IHsCode {
  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ required: true, index: 'text' })
  description: string;

  @Prop({ index: true })
  chapter?: string;

  @Prop({ index: true })
  section?: string;

  @Prop({ index: true })
  type?: string;

  @Prop({ required: true, enum: HsCodeLoyalty, index: true })
  loyalty: HsCodeLoyalty;

  @Prop({ type: String })
  comment?: string;

  @Prop({ default: true, index: true })
  active: boolean;
}

export const HsCodeSchema = SchemaFactory.createForClass(HsCode);

HsCodeSchema.index({ code: 1, active: 1 });
