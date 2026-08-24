import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import {
  IAuthService,
  IAuthToken,
  IConfirmRegistration,
  ILoginAdmin,
  IRegistration,
  IRestoreConfirm,
  ITemporaryToken,
} from './auth.service.interface';
import { ConfigService } from '@nestjs/config';
import { AccountPattern } from 'lib/enums/models/account.enums';
import { TokenPattern } from 'lib/enums/models/token.enums';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { IAuth } from 'lib/interfaces/models/auth.interface';
import { IToken } from 'lib/interfaces/models/token.interface';
import { CodePattern } from 'lib/enums/models/code.enums';
import { ICryptoAuthService } from 'lib/services/crypto360/auth/auth.service.interface';
import { IEmailField } from '../../../lib/interfaces/email-field.interface';
import { AuthEvents, SenderPattern } from '../../../lib/enums/models/sender.enums';
import moment from 'moment';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import { SocketPattern } from '../../../lib/enums/models/socket.enum';

export const AUTH_SERVICE = 'AUTH_SERVICE';

@Injectable({ scope: Scope.REQUEST })
export class AuthService implements IAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REQUEST) private req: Request,
    @InjectNats() readonly client: NatsClientProxy,
    @Inject('ICryptoAuthService') private readonly cryptoAuthService: ICryptoAuthService,
  ) {}

  async registration(dto: IRegistration): Promise<void> {
    const account = await this.client.send<IAccount>(AccountPattern.CREATE, dto);
    await this.sendRegistrationCode(account);
  }

  async reSendCode(dto: IEmailField): Promise<void> {
    const account = await this.client.send<IAccount>(AccountPattern.FIND_ONE, { query: dto });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (account.active) {
      throw new BadRequestException('Account already activated.');
    }

    await this.sendRegistrationCode(account);
  }

  async sendRegistrationCode(account: IAccount) {
    const expirationMs = this.configService.get('code.registrationCodeExpiresMs');
    const expirationDate = moment().add(expirationMs, 'milliseconds').toISOString();

    const code = await this.client.send<string>(CodePattern.GENERATE, {
      account: account._id,
      type: 'registration',
      expirationDate,
    });

    await this.client
      .send(SenderPattern.SEND_USER, {
        type: AuthEvents.REGISTRATION,
        account: account,
        data: {
          code,
        },
        language: account.lang,
      })
      .catch();
  }

  async confirmRegistration(dto: IConfirmRegistration): Promise<IAuth> {
    let account = await this.client.send<IAccount>(AccountPattern.FIND_ONE, { query: { email: dto.email } });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    await this.client.send<boolean>(AccountPattern.VERIFY_CODE, {
      account: account._id,
      type: 'registration',
      code: dto.code,
    });

    account = await this.client.send<IAccount>(AccountPattern.UPDATE_ONE, {
      query: {
        _id: account._id,
      },
      update: {
        active: true,
      },
    });

    return this.getVerifyData({
      account: account,
      ip: this.req.clientIp,
      userAgent: this.req.userAgent,
      domain: this.req.domain,
    });
  }

  async restore(dto: IEmailField): Promise<void> {
    const account = await this.client.send(AccountPattern.FIND_ONE, { query: { emailStrict: dto.email } });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    const expirationMs = this.configService.get('code.registrationCodeExpiresMs');
    const expirationDate = moment().add(expirationMs, 'milliseconds').toISOString();

    const code = await this.client.send<string>(CodePattern.GENERATE, {
      account: account._id,
      type: 'restore',
      expirationDate,
    });

    await this.client
      .send(SenderPattern.SEND_USER, {
        type: AuthEvents.RESTORE,
        account: account,
        data: {
          code,
        },
        language: account.lang,
      })
      .catch();
  }

  async restoreConfirm(dto: IRestoreConfirm): Promise<IAuth> {
    let account = await this.client.send(AccountPattern.FIND_ONE, { query: { emailStrict: dto.email } });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    await this.client.send<boolean>(AccountPattern.VERIFY_CODE, {
      account: account._id,
      type: 'restore',
      code: dto.code,
    });

    const updateDto: any = { password: dto.password };

    if (!account.active) {
      updateDto.active = true;
    }

    account = await this.client.send(AccountPattern.UPDATE_ONE, {
      query: {
        _id: account._id,
      },
      update: updateDto,
    });

    return this.getVerifyData({
      account: account,
      ip: this.req.clientIp,
      userAgent: this.req.userAgent,
      domain: this.req.domain,
    });
  }

  async cryptoAuthMe(data: IAuthToken) {
    return this.cryptoAuthService.me(data.token);
  }

  async loginCryptoAuth(account: IAccount) {
    return this.getVerifyData({
      account: account,
      ip: this.req.clientIp,
      userAgent: this.req.userAgent,
      domain: this.req.domain,
    });
  }

  async login(dto: ILoginAdmin): Promise<IAuth> {
    const account = await this.verifyPasswordAccount(dto);

    return this.getVerifyData({
      account: account,
      ip: this.req.clientIp,
      userAgent: this.req.userAgent,
      domain: this.req.domain,
    });
  }

  private async sendCode(account, type: string) {
    await this.client.send<string>(CodePattern.GENERATE, { account: account._id, type });

    // todo send sms and email
  }

  private async verifyPasswordAccount(dto: ILoginAdmin) {
    const account = await this.client.send<IAccount>(AccountPattern.VERIFY_PASSWORD, {
      email: dto.email,
      password: dto.password,
    });

    if (!account.active) {
      throw new BadRequestException('User not confirmed');
    }

    if (account.blocked) {
      throw new BadRequestException('User is blocked');
    }

    return account;
  }

  async logout(): Promise<void> {
    await this.client.send<IToken>(TokenPattern.DELETE, {
      account: this.req.account,
      userAgent: this.req.userAgent,
    });

    await this.client.send(SocketPattern.DISCONNECT_ONE, {
      account: this.req.account,
    });
  }

  private async verifyRefreshToken(params: ITemporaryToken): Promise<IAuth> {
    const token = await this.client.send<IToken>(TokenPattern.FIND_ONE, {
      userAgent: params.userAgent,
      hash: params.token,
      domain: params.domain,
    });

    return this.getVerifyData({
      account: token.account,
      ip: params.ip,
      userAgent: params.userAgent,
      domain: params.domain,
    });
  }

  async refreshToken({ token }: IAuthToken): Promise<IAuth> {
    try {
      return this.verifyRefreshToken({
        token,
        ip: this.req.clientIp,
        userAgent: this.req.userAgent,
        domain: this.req.domain,
      });
    } catch (e) {
      throw new NotFoundException('Refresh token not found');
    }
  }

  private async verifyAccessToken(params: ITemporaryToken, checkRefresh: boolean): Promise<IAuth> {
    const payload: any = this.jwtService.verify(params.token);

    if (!payload || !payload._id) {
      throw new Error('Payload is null');
    }

    if (payload.domain && payload.domain !== params.domain) {
      throw new Error('Incorrect domain');
    }

    const account = await this.client.send<IAccount>(AccountPattern.FIND_ONE, { query: { _id: payload._id } });

    if (checkRefresh) {
      const existRefreshToken = await this.client.send(TokenPattern.FIND_ONE, {
        account: account,
        userAgent: params.userAgent,
        domain: params.domain,
      });

      if (!existRefreshToken) {
        throw new Error('Not found refresh token');
      }
    }

    return {
      account: account,
      domain: params.domain,
      accessToken: params.token,
      ...(payload.exp && { exp: payload.exp * 1000 }),
    };
  }

  async verifyByToken(params: ITemporaryToken): Promise<IAuth> {
    try {
      return await this.verifyAccessToken(params, true);
    } catch (e) {
      throw new UnauthorizedException();
    }
  }

  private async getVerifyData(params: {
    account: IAccount;
    userAgent: string;
    ip: string;
    domain: string;
  }): Promise<IAuth> {
    const payload = { _id: params.account._id };

    const token = await this.client.send<IToken>(TokenPattern.CREATE, {
      account: params.account,
      userAgent: params.userAgent,
      ip: params.ip,
      domain: params.domain,
    });

    return {
      account: token.account,
      accessToken: this.jwtService.sign(payload, this.configService.get('tokens.accessToken')),
      refreshToken: token.hash,
      domain: token.domain,
    };
  }
}
