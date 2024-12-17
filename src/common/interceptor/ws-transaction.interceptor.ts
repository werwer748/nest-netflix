import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { catchError, Observable, tap } from 'rxjs';

@Injectable()
export class WsTransactionInterceptor implements NestInterceptor {
  constructor(
    private readonly dataSource: DataSource
  ) {
  }

  async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    //* 소켓을 사용할 때는 context.switchToWs().getClient()로 요청 객체를 가져온다.
    const client = context.switchToWs().getClient();

    const qr = this.dataSource.createQueryRunner();

    await qr.connect();
    await qr.startTransaction();

    client.data.queryRunner = qr;

    return next.handle().pipe(
      catchError(async (e) => {
        await qr.rollbackTransaction();
        await qr.release();

        throw e;
      }),
      tap(async () => {
        await qr.commitTransaction();
        await qr.release();
      }),
      // finalize(() => console.log('무조건 실행되는지 테스트!!'))
    );
  }
}