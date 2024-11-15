import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/**
 * QueryFailedError?
 * TypeORM에서 제공하는 에러 객체
 * 쿼리에 문제가 있어서 에러가 발생했을 때 이 에러가 던져진다.
 */
@Catch(QueryFailedError)
export class QueryFailedExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    //* QueryFailedError는 status가 없기 떄문에 임의로 400으로 설정
    const status = 400;

    let message = '데이터베이스 에러 발생!';

    if (exception.message.includes('duplicate key')) {
      message = '중복된 데이터가 존재합니다.';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}