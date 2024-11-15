import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { delay, Observable, tap } from 'rxjs';

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();

    const reqTime = Date.now();

    return next.handle()
      //* pipe: rxjs의 함수로, 여러 함수를 작성된 순서대로 실행한다.
      .pipe(
        //* delay: 응답을 지연시키는 함수
        // delay(1000),
        //* tap: 함수를 실행할 수 있다. - 비파괴적인 방법으로
        tap({
          next: () => {
            const respTime = Date.now();
            const diff = respTime - reqTime;

            // if (diff > 1000) {
            //   console.log(`!!!TIMEOUT!!! [${req.method} ${req.path}] ${diff}ms`);
            //
            //   throw new InternalServerErrorException('시간이 너무 오래 걸렸습니다!');
            // } else {
            //   console.log(`[${req.method} ${req.path}] ${diff}ms`);
            // }

            console.log(`[${req.method} ${req.path}] ${diff}ms`);
          }
        })
      )
  }
}