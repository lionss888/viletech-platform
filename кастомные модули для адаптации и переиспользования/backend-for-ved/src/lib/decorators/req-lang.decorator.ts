import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ReqLang = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.language;
});
