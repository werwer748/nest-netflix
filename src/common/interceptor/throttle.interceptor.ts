import { CallHandler, ExecutionContext, ForbiddenException, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { IThrottleDecorator } from '../interfaces/throttleDecorator.interface';
import { ThrottleDecorator } from '../decorator/throttle.decorator';

@Injectable()
export class ThrottleInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    // throttle 태그를 해놓은 라우트에서만 적용하기 위해서
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // URL_USERID_MINUTE
    // VALUE -> count

    const userId = request?.user?.sub;

    if (!userId) {
      return next.handle();
    }

    const throttleOptions = this.reflector.get<IThrottleDecorator>(
      ThrottleDecorator, context.getHandler()
    );

    if (!throttleOptions) {
      return next.handle();
    }

    const date = new Date();
    const minute = date.getMinutes();

    const key = `${request.method}_${request.path}_${userId}_${minute}`;

    const count = await this.cacheManager.get<number>(key);

    console.log('key:::', key);
    console.log('count:::', count);

    // 지정한 요청 횟수를 초과하면 에러를 발생시킨다.
    if (count && count >= throttleOptions.count) {
      throw new ForbiddenException('요청 가능 횟수를 초과하였습니다.');
    }

    return next.handle()
      .pipe(
        tap(async () => {
          const count = await this.cacheManager.get<number>(key) ?? 0;

          await this.cacheManager.set(key, count + 1, 60000);
        })
      );
  }
}