import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { Public } from '../decorator/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    //* Reflector는 메타데이터를 가져오는데 사용된다.
    private readonly reflector: Reflector
  ) {}
  canActivate(context: ExecutionContext): boolean {
    // @Public 데코레이터가 붙은 라우트는 무조건 통과시킨다.
    const isPublic = this.reflector.get(Public, context.getHandler());

    //? this.reflector.get(Public, context.getHandler())
    //? => Public 데코레이터에 파라미터로 넘어온 값을 가져온다. 아무것도 없을 경우 빈객체
    // console.log(isPublic);

    if (isPublic) {
      return true;
    }

    // 요청에서 user 객체가 존재하는지 확인한다.
    const request = context.switchToHttp().getRequest();

    if (!request.user || request.user.type !== 'access') {
      return false;
    }

    return true;
  }
}