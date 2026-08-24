import * as _ from 'lodash';
import internalIp from 'internal-ip';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { parseUrlToDomain } from '../utils/helpers/string.helper';
import { Lang } from '../enums/common.enums';

@Injectable()
export class RequestHandler implements NestMiddleware {
  @Inject() private configService: ConfigService;

  use(req: Request, res: Response, next: NextFunction) {
    req.clientIp =
      ((req.headers['cf-connecting-ip'] ||
        req.headers['x-original-forwarded-For'] ||
        req.headers['x-real-ip']) as string) || internalIp.v4.sync();
    req.userAgent = req.headers['user-agent'] || '';

    req.domain = parseUrlToDomain(req.headers['origin'] || req.hostname);

    req.accessDomain = _.some(
      this.configService.get<string[]>('whiteListDomain'),
      (domain) => domain && new RegExp(domain).test(req.domain),
    ); //todo remove

    if (_.includes(['ru'], req.headers['x-language'])) {
      req.language = req.headers['x-language'].toString() as Lang;
    } else {
      req.language = Lang.RU;
    }

    next();
  }
}
