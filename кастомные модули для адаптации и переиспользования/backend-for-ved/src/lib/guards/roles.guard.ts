import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { Request } from 'express';
import * as _ from 'lodash';
import { Reflector } from '@nestjs/core';
import { AccountRole } from 'lib/enums/models/account.enums';

@Injectable()
export class RolesGuard extends AuthGuard {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'rpc') {
      return true;
    }

    const isExternalUser = this.reflector.get<boolean>('isExternalUser', context.getHandler());

    if (isExternalUser) {
      return super.canActivateAuth(context);
    }

    const isUser = this.reflector.get<boolean>('isUser', context.getHandler());

    if (isUser) {
      return super.canActivate(context);
    }

    const role = this.reflector.get<AccountRole>('role', context.getHandler());
    const roles = this.reflector.get<AccountRole[]>('roles', context.getHandler());

    if (role || (roles && roles.length)) {
      await super.canActivate(context);

      const req = context.switchToHttp().getRequest<Request>();

      if (_.some(req.account.roles, (role) => role === AccountRole.ROOT)) {
        return true;
      }

      if (roles?.length) {
        if (!_.some(req.account.roles, (accountRole) => roles.includes(accountRole as AccountRole))) {
          throw new ForbiddenException(`Need one of roles: ${roles.join(', ')}.`);
        }
        return true;
      } else if (role) {
        if (!_.some(req.account.roles, (accountRole) => accountRole === role)) {
          throw new ForbiddenException(`Need role ${role}.`);
        }
        return true;
      }
    }

    return true;
  }
}
