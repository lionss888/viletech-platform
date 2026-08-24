import { ISchema } from 'lib/interfaces/schema.interface';
import { IContract } from './contract.interface';
import { IFile } from './file.interface';
import { IRequisites } from '../bank-requisites.interface';

export interface IDirector {
  name: string;
}

export interface IAgentBase {
  organizationName: string;
  inn?: string;
  kpp?: string;
  email?: string;
  phone?: string;
  requisites: IRequisites[];
  cryptoRequisites?: ICryptoRequisites[];
  contract?: string | IContract;
  contractTemplate?: string | IContract;
  director: IDirector;

  stamp?: string | IFile;
  signatures?: string | IFile;
}

export interface ICryptoRequisites {
  uuid: string;
  address: string;
  chain: string;
}

export interface IAgentCryptoRequisitesAdd extends Pick<ICryptoRequisites, 'address' | 'chain'> {}
export interface IAgentCryptoRequisitesRemove extends Pick<ICryptoRequisites, 'uuid'> {}

export interface IAgent extends ISchema, IAgentBase {}
