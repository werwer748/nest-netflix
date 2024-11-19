import { BadRequestException, Inject, Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { authVariableKeys } from '../../common/const/auth.const';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = this.validateBearerToken(authHeader);

    const blockedToken = await this.cacheManager.get(`BLOCK_TOKEN_${token}`);

    if (blockedToken) {
      throw new UnauthorizedException('차단된 토큰입니다!');
    }

    const tokeyKey = `TOKEN_${token}`;

    const cachedPayload = await this.cacheManager.get(tokeyKey);

    if (cachedPayload) {
      console.log('==== cache payload ====');
      req.user = cachedPayload;
      return next();
    }

    //? this.jwtService.decode는 검증없이 디코딩만 진행함
    const decodedPayload = this.jwtService.decode(token);

    if (decodedPayload.type !== 'refresh' && decodedPayload.type !== 'access') {
      throw new UnauthorizedException('잘못된 토큰입니다!');
    }


    try {
      const secretKey = decodedPayload.type === 'refresh' ?
        authVariableKeys.refreshTokenSecret : authVariableKeys.accessTokenSecret;

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>(secretKey),
      });

      // 토큰 만료날짜를 milliseconds로 변환 payload.exp는 epoch time (1970년도부터 지금까지 지나온 seconds)
      const expiryDate = +new Date(payload.exp * 1000);
      const now = +Date.now();

      const differenceInSeconds = (expiryDate - now) / 1000;

      await this.cacheManager.set(
        // 키
        tokeyKey,
        // 값
        payload,
        // 만료시간
        Math.max((differenceInSeconds - 30) * 1000, 1),
      );

      req.user = payload;
      return next();
    } catch (e) {
      //* 토큰 만료에러는 따로 잡아주도록 한다.
      if (e.name === 'TokenExpiredError') {
        throw new UnauthorizedException('토큰이 만료되었습니다!');
      }

      //* 에러시 가드 혹은 다음 로직으로 넘어가도록 next()를 호출한다.
      next();
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