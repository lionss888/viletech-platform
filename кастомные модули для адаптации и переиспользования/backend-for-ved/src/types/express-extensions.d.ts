import { Lang } from '../lib/enums/common.enums';
import { IAccount } from '../lib/interfaces/models/account.interface';

declare global {
  namespace Express {
    interface Request {
      clientIp?: string;
      userAgent?: string;
      domain?: string;
      accessDomain?: boolean;
      language?: Lang;
      account?: IAccount;
    }

    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
        destination?: string;
        filename?: string;
        path?: string;
      }
    }
  }
}

export {};
