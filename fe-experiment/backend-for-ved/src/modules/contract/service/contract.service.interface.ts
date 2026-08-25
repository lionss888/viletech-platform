import { IBaseOptions, IBaseQuery, IBaseService, UpdatePartial } from 'lib/services/base/base.service.interface';
import { IContract, IContractBase } from 'lib/interfaces/models/contract.interface';
import { Contract } from './contract.schema';
import { IAccount } from '../../../lib/interfaces/models/account.interface';
import { IPaginateOptions, IPaginateResult } from '../../../lib/interfaces/paginate.interface';

export interface IContractService extends IBaseService<IContract, IContractQuery> {
  createUser(createData: Partial<Contract>, options?: IBaseOptions): Promise<IContract>;

  findUser(findData: IContractQuery, options?: IPaginateOptions & IBaseOptions): Promise<IPaginateResult<IContract>>;

  createManager(createData: IContractManagerCreate, options?: IBaseOptions): Promise<IContract>;

  updateOneUser(
    findData: IContractQuery,
    updateData: UpdatePartial<Contract>,
    options?: IBaseOptions,
  ): Promise<IContract>;

  updateOneAdmin(
    findData: IContractQuery,
    updateData: UpdatePartial<Contract>,
    options?: IBaseOptions,
  ): Promise<IContract>;

  // VF-2: Отправка договора на подписание через Diadoc
  signContractViaDiadoc(findData: IContractQuery, recipientInn: string): Promise<IContract>;

  // VF-2: Поиск Contract по Diadoc document ID (для обработки webhook)
  findOneByDiadocDocumentId(documentId: string): Promise<IContract | null>;
}

export interface IContractQuery extends IBaseQuery, Partial<Omit<IContractBase, 'file'>> {
  organization?: string;
  accounts?: string[];
}

export interface IContractCreate {
  agent: string;
  file: string;
  organization?: string;
  account: IAccount;
}

export interface IContractManagerCreate {
  agent: string;
  organization?: string;
  file: string;
  adminAccount: string;
  account: string;
  date: Date;
  number: string;
}

export interface IContractCreateTemplate {
  file: string;
}

export interface IContractUpdate {
  date?: Date;
  number?: string;
}

export interface IContractAdminUpdate extends IContractUpdate {}

export interface IContractAccept extends IContractUpdate {}
