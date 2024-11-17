import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export const UserId = createParamDecorator((
  data: unknown,
  context: ExecutionContext
) => {
  const req = context.switchToHttp().getRequest();

  return req.user?.sub;
});