import { applyDecorators, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { SubscribeMessage } from '@nestjs/websockets';
import { WsValidationFilter } from '../filters/ws-exceptions.filter';

export const CatcherSubjectMessage = (subject: string) => {
  return applyDecorators(
    UseFilters(new WsValidationFilter()),
    UsePipes(new ValidationPipe({ transform: true })),
    SubscribeMessage(subject),
  );
};
