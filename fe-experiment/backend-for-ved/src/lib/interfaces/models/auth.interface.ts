import { IAccount } from 'lib/interfaces/models/account.interface';

export interface IAuthVerify {
  ip: string;
  userAgent: string;
  accessToken: string;
  refreshToken: string;
  domain: string;
}

export interface IAuth {
  account: IAccount;
  accessToken: string;
  refreshToken?: string;
  domain: string;
  exp?: number;
}
