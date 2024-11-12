import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(UnauthorizedException)
export class JwtExpiredExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.log('JwtExpiredExceptionFilter', exception.message);
    // 만료된 토큰일 경우 커스텀 메시지 설정
    const isTokenExpired = exception.message.includes('jwt expired');
    if (isTokenExpired) {
      return response.status(401).json({
        statusCode: 401,
        message: 'Token has expired, please login again.',
      });
    }

    // 다른 UnauthorizedException 예외에 대한 기본 처리
    response.status(401).json({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }
}