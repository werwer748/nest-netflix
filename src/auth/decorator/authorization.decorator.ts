import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// 데코레이터를 통해서 헤더에 있는 authorization을 가져올 수 있다.
export const AuthorizationDecorator = createParamDecorator(
  (data, context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();

    return req.headers['authorization'];
  }
);