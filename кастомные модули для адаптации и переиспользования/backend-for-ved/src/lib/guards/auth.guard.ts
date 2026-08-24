import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthPattern } from 'lib/enums/models/auth.enums';
import { IAuth } from 'lib/interfaces/models/auth.interface';
import { AccountPattern } from '../enums/models/account.enums';
import { InjectNats, NatsClientProxy } from '../modules/nats/nats-client-proxy';

@Injectable()
export class AuthGuard implements CanActivate {
  @InjectNats() client: NatsClientProxy;
  @Inject() readonly configService: ConfigService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'rpc') {
      return true;
    }

    try {
      await this.authenticateByHeader(context);
    } catch (e) {
      throw new UnauthorizedException();
    }

    return true;
  }

  async canActivateAuth(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'rpc') {
      return true;
    }

    try {
      await this.authenticateAuthByHeader(context);
    } catch (e) {
      throw new UnauthorizedException();
    }

    return true;
  }

  private async authenticateAuthByHeader(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();

    let token = req.headers['x-authorization'];

    if (req.params?.accessToken) {
      token = req.params.accessToken;
    }

    if (!token) {
      throw new Error('Token not found');
    }
    let account = null;

    try {
      account = await this.client.send<IAuth>(AuthPattern.VERIFY_CRYPTO_ACCOUNT_BY_TOKEN, {
        token,
      });
    } catch (e) {
      throw new UnauthorizedException();
    }

    req.account = await this.client.send(AccountPattern.FIND_OR_CREATE, account);
  }

  private async authenticateByHeader(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    let domain = req.domain;

    if (req.params?.domain) {
      domain = req.params.domain;
    }

    if (req.params?.accessToken) {
      token = req.params.accessToken;
    }

    if (!token) {
      throw new Error('Token not found');
    }

    const auth = await this.client.send<IAuth>(AuthPattern.VERIFY_ACCOUNT_BY_TOKEN, {
      token: token,
      ip: req.clientIp,
      userAgent: req.userAgent,
      domain: domain,
    });

    if (auth.account.blocked) {
      throw new BadRequestException('User is blocked');
    }

    req.account = auth.account;
  }
}
