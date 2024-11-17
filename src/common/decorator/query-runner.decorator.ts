import { createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';

export const QueryRuunerDeco = createParamDecorator((
  data: any,
  context: ExecutionContext
) => {
  const req = context.switchToHttp().getRequest();

  if (!req || !req.queryRunner) {
    throw new InternalServerErrorException('Query Runner 객체를 찾을 수 없습니다.')
  }

  return req.queryRunner;
});