import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { EMPTY, mergeMap, Observable, of } from 'rxjs';
import { INatsStreamMessage, NatsStreamMessage } from './nats-stream-message';
import _ from 'lodash';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';
import { splitBuffer } from '../../utils/split-buffer';
import { v4 as uuidv4 } from 'uuid';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { RpcException } from '@nestjs/microservices';

interface INatsCachedStreamResponse {
  id: string;
  data: string;
  index: number;
  isJson?: boolean;
}

export const GetNatsStreamInterceptor = (shouldValidate: boolean = true) => {
  @Injectable()
  class NatsStreamInterceptor implements NestInterceptor {
    cacheRecordTtl: number = 1800000; // миллисекунды - 30 минут

    constructor(@Inject(CACHE_MANAGER) readonly cacheManager: Cache) {}

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      // Стримовую обработку отключили — используем обычный next.handle()
      return next.handle();
    }

    async handleStreamRequest(
      context: ExecutionContext,
      rpcContext: RpcArgumentsHost,
      message: INatsStreamMessage,
    ): Promise<Observable<any> | undefined> {
      const handler = context.getHandler();
      const pattern = Reflect.getMetadata('microservices:pattern', handler);

      if (!message.isLast && message.data) {
        // Если чанк не последний, записываем его в кэш
        await this.setCachedRequest(pattern, message);

        return EMPTY;
      }

      if (message.isLast) {
        // Если чанк последний, собираем из чанков параметры для метода
        const messages = await this.getCachedRequests(pattern, message.id);

        const orderedChunks = _.orderBy(messages, 'index', 'asc'); // Сортируем чанки по порядку

        const result = Buffer.concat(
          // Формируем цельный буфер
          orderedChunks.map(({ data, encoding }) => Buffer.from(data, encoding)),
        );

        const encoding = orderedChunks[0].encoding;
        const isJson = orderedChunks[0].isJson;

        let methodArgs = isJson ? JSON.parse(result.toString(encoding)) : result; // Парсим json, если это json

        const dtoClass = this.getDtoClass(context);
        if (dtoClass && isJson && shouldValidate) {
          // Валидируем dto
          methodArgs = plainToInstance(dtoClass, methodArgs, {
            enableCircularCheck: true,
            enableImplicitConversion: true,
          });
          await validateOrReject(methodArgs);
        }

        if (rpcContext['args']) {
          // Присваиваем аргументы для вызова хэндлера
          rpcContext['args'][0] = methodArgs;
        }
      }
    }

    async handleStreamResponse(
      context: ExecutionContext,
      rpcContext: RpcArgumentsHost,
      message: any,
      next: CallHandler,
    ): Promise<Observable<any>> {
      const handler = context.getHandler();
      const pattern = Reflect.getMetadata('microservices:pattern', handler);

      if (NatsStreamMessage.isRpcStreamChunkRequest(message)) {
        const { cachedResponse, isLast } = await this.getCachedResponse(pattern, message.id);

        return of({
          id: cachedResponse.id,
          index: cachedResponse.index,
          isStream: true,
          isLast,
          encoding: NatsStreamMessage.encoding,
          isJson: cachedResponse.isJson,
          data: cachedResponse.data,
        });
      }

      if (!NatsStreamMessage.isRpcStream(message)) {
        const dtoClass = this.getDtoClass(context);
        let methodArgs = message;

        if (dtoClass && shouldValidate) {
          methodArgs = plainToInstance(dtoClass, methodArgs, {
            enableCircularCheck: true,
            enableImplicitConversion: true,
          });
          await validateOrReject(methodArgs);
        }

        if (rpcContext['args']) {
          rpcContext['args'][0] = methodArgs;
        }
      }

      return next.handle().pipe(
        mergeMap(async (result) => {
          if (!result) {
            return result;
          }

          const isJson = !Buffer.isBuffer(result);

          const buffer = isJson ? Buffer.from(JSON.stringify(result), NatsStreamMessage.encoding) : result;

          if (!NatsStreamMessage.isDataTooLarge(buffer)) {
            return result;
          }

          const chunks = splitBuffer(buffer, NatsStreamMessage.maxNatsChunkSize);
          const id = uuidv4();

          const firstChunk = chunks[0].toString(NatsStreamMessage.encoding);
          const restChunks = chunks.slice(1).map((chunk, index) => ({
            id,
            index: index + 1,
            data: chunk.toString(NatsStreamMessage.encoding),
            isJson,
          }));

          await this.setCachedResponses(pattern, id, restChunks);

          return {
            data: firstChunk,
            id,
            index: 0,
            isLast: false,
            encoding: NatsStreamMessage.encoding,
            isJson,
            isStream: true,
          };
        }),
      );
    }

    getDtoClass(context: ExecutionContext) {
      // Получение класса dto
      const target = context.getClass();
      const handler = context.getHandler();

      const paramTypes = Reflect.getMetadata('design:paramtypes', target.prototype, handler.name);

      return paramTypes?.[0];
    }

    async getCachedRequests(pattern: string, messageId: string): Promise<INatsStreamMessage[]> {
      const requestCurrentIndexCacheKey = this.getRequestCurrentIndexCacheKey(pattern, messageId);

      const currentIndexString = await this.cacheManager.get<string>(requestCurrentIndexCacheKey);
      if (!currentIndexString) {
        throw new RpcException('Current index was not found');
      }

      const currentIndexNumber = Number(currentIndexString);

      const cachedRequests: INatsStreamMessage[] = [];

      for (let i = 0; i <= currentIndexNumber; i++) {
        const requestCacheKey = this.getRequestCacheKey(pattern, messageId, i);

        const request = await this.cacheManager.get<string>(requestCacheKey);
        if (!request) {
          throw new RpcException('Cached request message was not found');
        }

        await this.cacheManager.del(requestCacheKey);
        cachedRequests.push(JSON.parse(request));
      }

      await this.cacheManager.del(requestCurrentIndexCacheKey);

      return cachedRequests;
    }

    async setCachedRequest(pattern: string, request: INatsStreamMessage): Promise<void> {
      const requestCurrentIndexCacheKey = this.getRequestCurrentIndexCacheKey(pattern, request.id);

      const currentIndexString = await this.cacheManager.get<string>(requestCurrentIndexCacheKey);
      const currentIndex = !_.isNil(currentIndexString) ? Number(currentIndexString) + 1 : 0;

      const requestCacheKey = this.getRequestCacheKey(pattern, request.id, currentIndex);

      await this.cacheManager.set(requestCurrentIndexCacheKey, `${currentIndex}`, this.cacheRecordTtl);
      await this.cacheManager.set(requestCacheKey, JSON.stringify(request), this.cacheRecordTtl);
    }

    async setCachedResponses(pattern: string, id: string, responses: INatsCachedStreamResponse[]): Promise<void> {
      const responseCurrentIndexCacheKey = this.getResponseCurrentIndexCacheKey(pattern, id);

      await this.cacheManager.set(responseCurrentIndexCacheKey, `${0}`, this.cacheRecordTtl);

      for (let i = 0; i < responses.length; i++) {
        const responseCacheKey = this.getResponseCacheKey(pattern, id, i);

        await this.cacheManager.set(responseCacheKey, JSON.stringify(responses[i]), this.cacheRecordTtl);
      }
    }

    async getCachedResponse(pattern: string, id: string) {
      const responseCurrentIndexCacheKey = this.getResponseCurrentIndexCacheKey(pattern, id);

      const currentIndexString = await this.cacheManager.get<string>(responseCurrentIndexCacheKey);
      if (!currentIndexString) {
        throw new RpcException(`Current index was not found`);
      }

      const currentIndex = Number(currentIndexString);

      const responseCacheKey = this.getResponseCacheKey(pattern, id, currentIndex);
      const cachedResponseString = await this.cacheManager.get<string>(responseCacheKey);

      const nextResponseCacheKey = this.getResponseCacheKey(pattern, id, currentIndex + 1);
      const nextResponse = await this.cacheManager.get<string>(nextResponseCacheKey);
      if (nextResponse) {
        await this.cacheManager.set(responseCurrentIndexCacheKey, `${currentIndex + 1}`, this.cacheRecordTtl);
      } else {
        await this.cacheManager.del(responseCurrentIndexCacheKey);
      }

      await this.cacheManager.del(responseCacheKey);

      return {
        cachedResponse: JSON.parse(cachedResponseString) as INatsCachedStreamResponse,
        isLast: !nextResponse,
      };
    }

    getRequestCurrentIndexCacheKey(pattern: string, messageId: string): string {
      return `${pattern}-${messageId}-request-current-index`;
    }

    getRequestCacheKey(pattern: string, messageId: string, index: number): string {
      return `${pattern}-${messageId}-request-${index}`;
    }

    getResponseCurrentIndexCacheKey(pattern: string, messageId: string): string {
      return `${pattern}-${messageId}-response-current-index`;
    }

    getResponseCacheKey(pattern: string, messageId: string, index: number): string {
      return `${pattern}-${messageId}-response-${index}`;
    }
  }

  return NatsStreamInterceptor;
};
