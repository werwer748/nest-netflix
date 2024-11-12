import { BadRequestException, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { authVariableKeys } from '../../common/const/auth.const';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // return next();
      throw new UnauthorizedException();
    }

    const token = this.validateBearerToken(authHeader);

    try {
      //? this.jwtService.decode는 검증없이 디코딩만 진행함
      const decodedPayload = this.jwtService.decode(token);

      if (decodedPayload.type !== 'refresh' && decodedPayload.type !== 'access') {
        throw new UnauthorizedException('잘못된 토큰입니다!');
      }

      const isRefreshToken = decodedPayload.type === 'refresh';

      const secretKey = isRefreshToken ?
        authVariableKeys.refreshTokenSecret : authVariableKeys.accessTokenSecret;

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>(secretKey),
      });

      req.user = payload;
      return next();
    } catch (e) {
      throw new UnauthorizedException('토큰이 만료되었습니다.');
    }
  }

  validateBearerToken(rawToken: string) {
    const basicSplit = rawToken.split(' ');

    if (basicSplit.length !== 2) {
      throw new BadRequestException('토큰 포맷이 잘못됐습니다!');
    }

    const [bearer, token] = basicSplit;

    if (bearer.toLowerCase() !== 'bearer') {
      throw new BadRequestException('토큰 포맷이 잘못됐습니다!');
    }

    return token;
  }
}