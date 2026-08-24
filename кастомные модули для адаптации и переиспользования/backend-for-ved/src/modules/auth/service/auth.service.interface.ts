import { ICodeField } from 'lib/interfaces/code-field.interface';
import { IAuth } from 'lib/interfaces/models/auth.interface';
import { IPasswordField } from 'lib/interfaces/password-field.interface';
import { IAccountCreate } from '../../account/service/account.service.interface';
import { AccountRole } from '../../../lib/enums/models/account.enums';
import { IEmailField } from '../../../lib/interfaces/email-field.interface';

export interface IAuthService {
  registration(dto: IRegistration): Promise<void>;

  reSendCode(dto: IEmailField): Promise<void>;

  confirmRegistration(dto: IConfirmRegistration): Promise<IAuth>;

  restore(dto: IEmailField): Promise<void>;

  restoreConfirm(dto: IRestoreConfirm): Promise<IAuth>;

  // loginCryptoAuth(account: IAccount): Promise<IAuth>;

  verifyByToken(params: ITemporaryToken): Promise<IAuth>;

  cryptoAuthMe(me: IAuthToken): Promise<any>;

  // login(dto: ILogin): Promise<void | undefined>;

  //
  login(dto: ILoginAdmin): Promise<IAuth>;

  logout(): Promise<void>;

  refreshToken(params: IAuthToken): Promise<IAuth>;
}

export interface ILoginAdmin extends IEmailField, IPasswordField {}

export interface IRegistration {
  email: string;
  password: string;
}

export interface IConfirmRegistration extends IEmailField, ICodeField {}

export interface IRestoreConfirm extends IEmailField, IPasswordField, ICodeField {}

export interface ILoginWithCodeAdmin extends ILoginAdmin, ICodeField {}

export interface ICreateAdmin extends IAccountCreate {
  password: string;
  roles: AccountRole[];
}

export interface IAuthToken {
  token: string;
}

export interface ITemporaryToken {
  token: string;
  domain: string;
  userAgent: string;
  ip: string;
}
