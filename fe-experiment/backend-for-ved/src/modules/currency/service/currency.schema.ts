import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { ICurrency } from 'lib/interfaces/models/currency.interface';
import { AllCurrencies, CurrencyDirection } from 'lib/enums/common.enums';
import { CurrencySource, CurrencyType } from 'lib/enums/models/currency.enums';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'currencies',
})
export class Currency extends BaseSchema implements ICurrency {
  @Prop({ unique: false, required: true, index: true, enum: AllCurrencies })
  symbol: AllCurrencies;

  @Prop({ required: true })
  rate: number;

  @Prop({ required: true, default: true })
  active: boolean;

  @Prop({ required: false, enum: CurrencyDirection, default: CurrencyDirection.NO })
  direction: CurrencyDirection;

  @Prop({ required: true })
  timestamp: number;

  // Источник курса
  @Prop({ required: true, enum: CurrencySource })
  source: CurrencySource;

  @Prop({ required: true, enum: CurrencyType })
  type: CurrencyType;
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);

CurrencySchema.index({ symbol: 1, source: 1 }, { unique: true });
