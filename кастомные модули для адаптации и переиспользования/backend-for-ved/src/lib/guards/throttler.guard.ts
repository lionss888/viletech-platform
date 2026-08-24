import { ExecutionContext, Injectable } from '@nestjs/common';
import md5 from 'md5';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerModuleOptions } from '@nestjs/throttler/dist/throttler-module-options.interface';
import { ThrottlerStorage } from '@nestjs/throttler/dist/throttler-storage.interface';
import { Reflector } from '@nestjs/core';
import * as _ from 'lodash';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    protected configService: ConfigService,
  ) {
    super(options, storageService, reflector);
  }

  generateKey(context: ExecutionContext) {
    return md5(context.switchToHttp().getRequest().clientIp);
  }

  async handleRequest(context: ExecutionContext, limit: number, ttl: number): Promise<boolean> {
    if (context.getType() === 'rpc') {
      return true;
    }

    if (_.includes(this.configService.get('whiteListIp'), context.switchToHttp().getRequest().clientIp)) {
      return true;
    }

    return super.handleRequest(context, limit, ttl);
  }
}
