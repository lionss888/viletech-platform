import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import {
  ILiquidity,
  LiquidityRates as TLiquidityRates,
  LiquidityExportRates,
  LiquidityCommitmentsRates,
  LiquidityImportRates,
} from '../../../lib/interfaces/models/liquidity.interface';
import { Schema as MongooseSchema } from 'mongoose';

@Schema({ _id: false })
export class LiquidityRates implements TLiquidityRates {
  @Prop({ required: true })
  rub: number;

  @Prop({ required: true })
  usd: number;

  @Prop({ required: true })
  eur: number;

  @Prop({ required: true })
  cny: number;

  @Prop({ required: true })
  jpy: number;

  @Prop({ required: true })
  try: number;

  @Prop({ required: true })
  inr: number;

  @Prop({ required: true })
  hkd: number;

  @Prop({ required: true })
  aed: number;

  @Prop({ required: true })
  usdt: number;

  @Prop({ required: true })
  btc: number;

  @Prop({ required: true })
  eth: number;

  @Prop({ required: true })
  cad: number;

  @Prop({ required: true })
  sgd: number;

  @Prop({ required: true })
  gbp: number;

  @Prop({ required: true })
  thb: number;

  @Prop({ required: true })
  chf: number;
}

export const LiquidityRatesSchema = SchemaFactory.createForClass(LiquidityRates);

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'liquidity',
})
export class Liquidity extends BaseSchema implements ILiquidity {
  // Import хранит детализацию по агентам: { rub: { "agentName1": 100, "agentName2": 50, amount: 150 }, totalAmount: 350 }
  @Prop({ required: true, type: MongooseSchema.Types.Mixed, default: () => ({ totalAmount: 0 }) })
  import: LiquidityImportRates;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed, default: () => ({ totalAmount: 0 }) })
  export: LiquidityExportRates;

  @Prop({ required: false, type: MongooseSchema.Types.Mixed, default: () => ({ totalAmount: 0 }) })
  commitments?: LiquidityCommitmentsRates;
}

export const LiquiditySchema = SchemaFactory.createForClass(Liquidity);
