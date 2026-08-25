import { ISchema } from '../schema.interface';
import { IAccount } from './account.interface';

export interface ITokenBase {
  account: IAccount;
  hash: string;
  domain?: string;
  userAgent: string;
  ip: string;
  expires: Date;
}

export interface IToken extends ISchema, ITokenBase {}
