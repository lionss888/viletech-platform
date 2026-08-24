import { IAccount } from 'lib/interfaces/models/account.interface';
import { ISchema } from 'lib/interfaces/schema.interface';
import { IFormPaymentParsedData } from 'lib/interfaces/excel-parser.interface';
import { FileParseStatus } from 'lib/enums/models/file.enums';

export interface IFileBase {
  account?: string | IAccount;
  originalName: string;
  mimeType: string;
  salt?: string;
  path?: string;
  size: number;
  private: boolean;
  parsedValue?: IFormPaymentParsedData;
  parseError?: string;
  parseStatus?: FileParseStatus;
  parseTemplateId?: string;
  lastParsedAt?: Date;
}

export interface IFile extends ISchema, IFileBase {}
