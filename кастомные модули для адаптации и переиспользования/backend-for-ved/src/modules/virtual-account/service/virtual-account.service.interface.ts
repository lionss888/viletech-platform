import { IVirtualAccount } from 'lib/interfaces/models/virtual-account.interface';

export interface IVirtualAccountService {
  create(data: IVirtualAccountCreate): Promise<IVirtualAccount>;

  findOne(findData: IVirtualAccountQuery): Promise<IVirtualAccount | null>;

  findMany(findData: IVirtualAccountQuery): Promise<IVirtualAccount[]>;

  update(id: string, data: IVirtualAccountUpdate): Promise<IVirtualAccount>;

  delete(id: string): Promise<void>;

  addToReserved(accountId: string, currency: string, type: string, amount: number): Promise<IVirtualAccount>;

  subtractFromReserved(accountId: string, currency: string, type: string, amount: number): Promise<IVirtualAccount>;

  moveFromReservedToAvailable(
    accountId: string,
    currency: string,
    type: string,
    amount: number,
  ): Promise<IVirtualAccount>;
}

export interface IVirtualAccountCreate {
  currency: string;
  available?: number;
  reserved?: number;
  totalBalance?: number;
  type: string;
  account: string;
}

export interface IVirtualAccountUpdate {
  available?: number;
  reserved?: number;
}

export interface IVirtualAccountQuery {
  account?: string;
  currency?: string;
  type?: string;
  _id?: string;
}
