import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FeatureContext } from '../classes/feature-context.class';

/**
 * Декоратор для внедрения контекста запроса в методы контроллера.
 * Извлекает информацию об аутентифицированном пользователе из request.account.
 */
export const ReqContext = createParamDecorator((data: unknown, ctx: ExecutionContext): FeatureContext => {
  const request = ctx.switchToHttp().getRequest();
  return new FeatureContext({
    accountId: request.account?._id,
    accountRoles: request.account?.roles || [],
  });
});
