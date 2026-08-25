import { IToken, ITokenBase } from 'lib/interfaces/models/token.interface';

export interface ITokenService {
  create(data: ITokenCreate): Promise<IToken>;

  findOne(findData: ITokenQuery): Promise<IToken>;

  delete(data: ITokenDelete): Promise<void>;
}

export interface ITokenCreate extends Omit<ITokenBase, 'hash' | 'expires'> {}

export interface ITokenDelete extends Omit<ITokenCreate, 'ip'> {}

export interface ITokenQuery extends Partial<ITokenCreate> {}
