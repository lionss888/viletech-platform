import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IConfiguration } from 'lib/interfaces/models/configuration.interface';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'configuration',
})
export class Configuration extends BaseSchema implements IConfiguration {
  @Prop({ required: true, min: 0, max: 100 })
  openExchangeCorrectionPercent: number;

  @Prop({ required: true, min: 0, max: 100 })
  usdtCorrectionPercent: number;
}

export const ConfigurationSchema = SchemaFactory.createForClass(Configuration);
