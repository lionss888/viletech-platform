import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema } from 'lib/services/base/base.schema';
import { IContract } from 'lib/interfaces/models/contract.interface';
import mongoose from 'mongoose';
import { IAccount } from '../../../lib/interfaces/models/account.interface';
import { IAgent } from '../../../lib/interfaces/models/agent.interface';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';
import { IOrganization } from '../../../lib/interfaces/models/organization.interface';

@Schema({
  timestamps: {
    createdAt: 'createDate',
    updatedAt: 'updateDate',
  },
  collection: 'contracts',
})
export class Contract extends BaseSchema implements IContract {
  @Prop({ type: mongoose.Schema.Types.ObjectId, sparse: true, index: true, ref: 'Account' })
  account?: string | IAccount;

  @Prop({ type: mongoose.Schema.Types.ObjectId, sparse: true, index: true, ref: 'Organization' })
  organization?: string | IOrganization;

  @Prop({ type: mongoose.Schema.Types.ObjectId, sparse: true, index: true, ref: 'Agent' })
  agent?: string | IAgent;

  @Prop({ required: true, index: true, default: false })
  isTemplate: boolean;

  @Prop({ enum: ContractStatus, required: false, index: true, sparse: true, default: ContractStatus.CREATED })
  status?: ContractStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true, ref: 'File' })
  file: string;

  @Prop({ required: false })
  date?: Date;

  @Prop({ required: false })
  number?: string;

  @Prop({ required: false })
  rejectText?: string;

  // VF-2: Поля для интеграции с Diadoc
  @Prop({ required: false })
  diadocDocumentId?: string;

  @Prop({ required: false })
  diadocMessageId?: string;

  @Prop({ required: false, enum: ['manual', 'diadoc'], default: 'manual' })
  signatureType?: 'manual' | 'diadoc';

  @Prop({ required: false })
  diadocSignedAt?: Date;

  // VF-2 FIX: Флаг - договор на подписании в ЭДО
  @Prop({ required: false, default: false })
  isDiadocSigning?: boolean;

  // VF-2 FIX: Дата отправки договора в Diadoc (для 3-дневного уведомления)
  @Prop({ required: false })
  diadocSentAt?: Date;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);
