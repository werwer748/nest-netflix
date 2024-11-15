import { ArgumentsHost, Catch, ExceptionFilter, ForbiddenException } from '@nestjs/common';

@Catch(ForbiddenException)
export class ForbiddenExceptionFilter implements ExceptionFilter {
  //? ArgumentsHost: excution context의 부모라고 보면 됨
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception.getStatus();

    console.log(`[UnauthorizedException] ${request.method} ${request.path}`);

    response.status(status)
      // body를 원하는데로 바꿔서 응답을 던져줄 수 있다.
      .json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: '접근 권한이 없습니다.',
    });
  }
}