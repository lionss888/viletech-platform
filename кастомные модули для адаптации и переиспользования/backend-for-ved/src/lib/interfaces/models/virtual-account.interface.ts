import { ISchema } from '../schema.interface';
import { AllCurrencies } from '../../enums/common.enums';
import { VirtualAccountType } from '../../enums/models/virtual-account.enums';
import { IAccount } from './account.interface';

export interface IVirtualAccountBase {
  currency: AllCurrencies;
  available: number;
  reserved: number;
  totalBalance: number;
  type: VirtualAccountType;
  account: string | IAccount;
}

export interface IVirtualAccount extends IVirtualAccountBase, ISchema {}
