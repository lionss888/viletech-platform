import { OnEvent } from '@nestjs/event-emitter';
import { EventPattern } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices/enums';
import { RpcValidationFilter } from '../filters/rcp-exceptions.filter';
import { applyDecorators, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';

export const CatcherEventPattern = (pattern: string) => {
  return applyDecorators(
    UseFilters(new RpcValidationFilter()),
    UsePipes(new ValidationPipe({ transform: true })),
    OnEvent(pattern),
  );
};

export const CatcherExternalEventPattern = (pattern: string, transportId: Transport | symbol = Transport.NATS) => {
  return applyDecorators(
    UseFilters(new RpcValidationFilter()),
    UsePipes(new ValidationPipe({ transform: true })),
    EventPattern(pattern, transportId),
  );
};
