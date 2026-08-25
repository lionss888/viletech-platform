import { applyDecorators, UseFilters, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices/enums';
import { RpcValidationFilter } from '../filters/rcp-exceptions.filter';
import { GetNatsStreamInterceptor } from '../modules/nats/nats-stream.interceptor';
import { CursorInterceptor } from '../modules/nats/cursor.interceptor';

type Options = {
  transport?: Transport | symbol;
  handleCursor?: boolean;
};

export const CatcherMessagePattern = (pattern: string, { transport = Transport.NATS, handleCursor }: Options = {}) => {
  // Streaming pipeline отключаем целиком (частые проблемы с кешем/чанками),
  // используем обычные RPC-сообщения.
  return applyDecorators(
    UseFilters(new RpcValidationFilter()),
    handleCursor ? UseInterceptors(CursorInterceptor) : UseInterceptors(),
    MessagePattern(pattern, transport),
  );
};
