import { ISchema } from 'lib/interfaces/schema.interface';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { HttpMethod } from 'lib/enums/http-method.enums';

export interface IAdminActivityBase {
  account: string | IAccount;
  path: string;
  method: HttpMethod;
  params: Object;
  query: Object;
  body: Object;
}

export interface IAdminActivity extends IAdminActivityBase, ISchema {}
