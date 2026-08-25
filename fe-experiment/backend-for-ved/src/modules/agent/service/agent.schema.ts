import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IAgent, ICryptoRequisites, IDirector } from 'lib/interfaces/models/agent.interface';
import mongoose from 'mongoose';
import { IRequisites } from 'lib/interfaces/bank-requisites.interface';

@Schema({ _id: false })
export class Requisites implements IRequisites {
  @Prop({ required: true, index: true })
  bankName: string;

  @Prop({ required: true, index: true })
  accountNumber: string;

  @Prop({ required: false, index: true, sparse: true })
  swiftCode?: string;

  @Prop({ required: false, index: true, sparse: true })
  bankCountry?: string;

  @Prop({ required: false, index: true, sparse: true })
  bankAddress?: string;

  @Prop({ required: false, index: true, sparse: true })
  bik?: string;

  @Prop({ required: false, index: true, sparse: true })
  corrNumber?: string;
}

export const RequisitesSchema = SchemaFactory.createForClass(Requisites);

@Schema({ _id: false })
class Director implements IDirector {
  @Prop({ required: true })
  name: string;
}

export const DirectorSchema = SchemaFactory.createForClass(Director);

@Schema({ _id: false })
export class CryptoRequisites implements ICryptoRequisites {
  @Prop({ required: true, index: true })
  uuid: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  chain: string;
}

export const CryptoRequisitesSchema = SchemaFactory.createForClass(CryptoRequisites);

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'agents',
})
export class Agent extends BaseSchema implements IAgent {
  @Prop({ required: true, index: true })
  organizationName: string;

  @Prop({ required: false, index: true, sparse: true })
  inn?: string;

  @Prop({ required: false, index: true, sparse: true })
  kpp?: string;

  @Prop({ required: false, index: true, sparse: true })
  email?: string;

  @Prop({ required: false, index: true, sparse: true })
  phone?: string;

  @Prop({ required: true, type: [RequisitesSchema] })
  requisites: Requisites[];

  @Prop({ required: true, type: [CryptoRequisitesSchema] })
  cryptoRequisites: CryptoRequisites[];

  @Prop({
    required: true,
  })
  director: Director;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  stamp?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false, ref: 'File' })
  signatures?: string;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
