import * as _ from 'lodash';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import md5 from 'md5';
import { OutgoingHttpHeaders } from 'http';

const existRequests = new Map();

@Injectable()
export class Bulkhead implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'GET') {
      return next();
    }

    const hash = md5(
      req.clientIp +
        req.userAgent +
        req.path +
        req.method +
        JSON.stringify(req.body || '') +
        JSON.stringify(req.query || ''),
    ) as string;

    if (!existRequests.has(hash)) {
      this.setExistRequest(hash, res);
      req.on('close', () => existRequests.delete(hash));
    } else {
      const response: { status: number; data: any; headers: OutgoingHttpHeaders } = await existRequests.get(hash);

      _.each(Object.entries(response.headers), ([key, value]) => !res.get(key) && res.setHeader(key, value as string)); //todo check

      res.status(response.status).send(response.data);
    }

    next();
  }

  private setExistRequest(hash: string, res: Response) {
    const end = res.end;
    const responsePromise = new Promise((resolve) => {
      res.end = function (data) {
        resolve({ status: res.statusCode, headers: res.getHeaders(), data });
        end.apply(res, arguments);
      } as any;
    });

    existRequests.set(hash, responsePromise);
  }
}
