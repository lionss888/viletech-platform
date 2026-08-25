import { ISchema } from 'lib/interfaces/schema.interface';
import { ICodeField } from 'lib/interfaces/code-field.interface';
import { IAccount } from './account.interface';
import { CodeType } from 'lib/enums/models/code.enums';

export interface ICodeBase extends ICodeField {
  type: CodeType;
  account: IAccount | string;
  expirationDate?: Date;
}

export interface ICode extends ICodeBase, ISchema {}
