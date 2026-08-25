import { ICode, ICodeBase } from 'lib/interfaces/models/code.interface';
import { IAccountField } from 'lib/interfaces/account-filed.interface';
import { IBaseOptions, IBaseQuery, IBaseService } from 'lib/services/base/base.service.interface';

export interface ICodeService extends IBaseService<ICode, ICodeQuery, ICodeOptions, ICodeCreate> {
  verify(code: ICodeBase): Promise<boolean>;

  generate(data: ICodeCreate): Promise<string>;

  removeMany(data: IAccountField): Promise<void>;

  createManyFull(data: ICodeCreateManyFull): Promise<void>;
}

export interface ICodeQuery extends IBaseQuery {}
export interface ICodeOptions extends IBaseOptions {}

export interface ICodeCreate extends Pick<ICode, 'type' | 'account'> {
  expirationDate?: Date | string;
}
export interface ICodeCreateFull extends Omit<ICodeBase, 'code'> {
  hash: string;
  salt: string;
}

export interface ICodeCreateManyFull {
  data: ICodeCreateFull[];
}
