import { IAccount } from 'lib/interfaces/models/account.interface';
import { Lang } from 'lib/enums/common.enums';

export interface IMailService {
  send(data: IMailSend): Promise<void>;
}

export interface IMailSend {
  account?: IAccount;
  type: string;
  managerEmails?: string[];
  toAdmins?: boolean;
  language: Lang;
  data: any;
}
