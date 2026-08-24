import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { mergeMap, Observable } from 'rxjs';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { RpcException } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { IPaginateResult } from '../../interfaces/paginate.interface';
import { v4 as uuidv4 } from 'uuid';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { INatsCursorRequest, NatsCursorMessage } from './nats-cursor-message';
import _ from 'lodash';

interface ICachedCursor {
  id: string;
  skip: number;
}

@Injectable()
export class CursorInterceptor implements NestInterceptor {
  private readonly batchSize: number = 50;
  private readonly cachedCursorTtl: number = 3600000; // миллисекунды - 60 минут

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const contextType = context.getType();

    if (contextType !== 'rpc') {
      return next.handle();
    }

    const rpcContext = context.switchToRpc();
    const message = rpcContext.getData();

    if (NatsCursorMessage.isInitiateCursor(message)) {
      return await this.handleInitiateCursor(context, rpcContext, next);
    }

    if (NatsCursorMessage.isCursorRequest(message)) {
      return await this.handleCursorRequest(context, rpcContext, next, message);
    }

    return next.handle();
  }

  private async handleInitiateCursor(context: ExecutionContext, rpcContext: RpcArgumentsHost, next: CallHandler) {
    const dtoClass = this.getDtoClass(context);
    if (!dtoClass) {
      throw new RpcException(`Dto not intercept cursor`);
    }

    rpcContext['args'][0] = this.tryMakeMethodArgs(dtoClass, rpcContext['args'][0]);

    const cursorId = uuidv4();
    const cursorCacheKey = this.getCursorCacheKey(cursorId);

    await this.cacheManager.set(
      cursorCacheKey,
      JSON.stringify({
        id: cursorId,
        skip: this.batchSize,
      }),
      this.cachedCursorTtl,
    );

    return next.handle().pipe(
      mergeMap(async (result: IPaginateResult<any>) => {
        if (!result.docs || !Array.isArray(result.docs)) {
          throw new RpcException(`Handler returned wrong result. There must be a PaginateResult`);
        }

        const done = !result.docs.length;

        if (done) {
          await this.cacheManager.del(cursorCacheKey);
        }

        return {
          cursorId,
          data: result.docs,
          done,
        };
      }),
    );
  }

  private async handleCursorRequest(
    context: ExecutionContext,
    rpcContext: RpcArgumentsHost,
    next: CallHandler,
    message: INatsCursorRequest,
  ) {
    const cachedCursor = await this.getCachedCursor(message.cursorId);

    const dtoClass = this.getDtoClass(context);
    if (!dtoClass) {
      throw new RpcException(`Dto not intercept cursor`);
    }

    rpcContext['args'][0] = this.tryMakeMethodArgs(dtoClass, rpcContext['args'][0], cachedCursor);

    const cursorCacheKey = this.getCursorCacheKey(cachedCursor.id);
    await this.cacheManager.set(
      cursorCacheKey,
      JSON.stringify({
        id: cachedCursor.id,
        skip: cachedCursor.skip + this.batchSize,
      }),
      this.cachedCursorTtl,
    );

    return next.handle().pipe(
      mergeMap(async (result: IPaginateResult<any>) => {
        if (!result.docs || !Array.isArray(result.docs)) {
          throw new RpcException(`Handler returned wrong result. There must be a PaginateResult`);
        }

        return {
          cursorId: cachedCursor.id,
          data: result.docs,
          done: !result.docs.length,
        };
      }),
    );
  }

  private async getCachedCursor(cursorId: string): Promise<ICachedCursor> {
    const cursorCacheKey = this.getCursorCacheKey(cursorId);

    const cursorString = await this.cacheManager.get<string>(cursorCacheKey);
    if (!cursorString) {
      throw new RpcException(`Cursor ${cursorId} not found`);
    }

    return JSON.parse(cursorString) as ICachedCursor;
  }

  private getCursorCacheKey(cursorId: string) {
    return `cursor-${cursorId}`;
  }

  private getDtoClass(context: ExecutionContext) {
    // Получение класса dto
    const target = context.getClass();
    const handler = context.getHandler();

    const paramTypes = Reflect.getMetadata('design:paramtypes', target.prototype, handler.name);

    return paramTypes?.[0];
  }

  private async tryMakeMethodArgs(dtoClass: any, rpcContextArgs: any, cachedCursor?: ICachedCursor) {
    let methodArgs = _.omit(rpcContextArgs, ['initiateCursor', 'data']);

    try {
      const page = cachedCursor ? cachedCursor.skip / this.batchSize + 1 : 1;

      methodArgs = {
        ...rpcContextArgs.data,
        page,
        limit: this.batchSize,
      };

      methodArgs = plainToInstance(dtoClass, methodArgs);
      await validateOrReject(methodArgs, { whitelist: true });
    } catch {
      throw new RpcException(`To use a cursor, dto must accept query and paginate options.`);
    }

    return methodArgs;
  }
}
