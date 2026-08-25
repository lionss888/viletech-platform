import { ISchema } from 'lib/interfaces/schema.interface';
import { IAccount } from './account.interface';
import { IAgent } from './agent.interface';
import { IFile } from './file.interface';
import { ContractStatus } from '../../enums/models/contract.enums';
import { IOrganization } from './organization.interface';

export interface IContractBase {
  account?: string | IAccount;
  agent?: string | IAgent;
  organization?: string | IOrganization;
  isTemplate: boolean;
  file: string | IFile;
  date?: Date;
  number?: string;
  status?: ContractStatus;
  rejectText?: string;

  // VF-2: Поля для интеграции с Diadoc
  diadocDocumentId?: string;
  diadocMessageId?: string;
  signatureType?: 'manual' | 'diadoc';
  diadocSignedAt?: Date;
}
export interface IContract extends ISchema, IContractBase {}
