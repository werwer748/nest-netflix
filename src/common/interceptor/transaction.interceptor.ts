import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, finalize, from, Observable, tap } from 'rxjs';
import { DataSource } from 'typeorm';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();

    const qr = this.dataSource.createQueryRunner();

    await qr.connect();
    await qr.startTransaction();

    req.queryRunner = qr;

    /**
     * from?
     * NestJS의 next.handle()은 일반적으로 Observable을 반환하지만,
     * 다른 미들웨어나 요청 흐름에서 Promise를 반환할 수도 있습니다.
     * 이때 from(next.handle())으로 감싸면 비동기 객체(예: Promise)를 Observable로 변환하여
     * RxJS 연산자 체인에서 일관성 있게 처리할 수 있습니다.
     *
     * 주요 역할
     * 1) 비동기 처리 통일:
     *    Promise나 다른 비동기 타입도 Observable로 변환할 수 있어,
     *    pipe를 통해 이후 연산자를 적용할 때 코드가 일관성을 유지합니다.
     * 오류 및 완료 이벤트 처리:
     *    Observable로 변환함으로써 pipe에서 tap, catchError, finalize 같은 연산자를 이용해
     *    쉽게 에러 및 완료 처리를 할 수 있습니다
     */
    return from(next.handle()).pipe(
      tap({
        next: async () => {
          await qr.commitTransaction();
        },
      }),
      catchError(async (err) => {
        await qr.rollbackTransaction();
        throw err;
      }),
      finalize(async () => {
        await qr.release();
      }),
    );
  }
}