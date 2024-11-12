import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, JwtService } from '@nestjs/jwt';
import { authVariableKeys } from '../../common/const/auth.const';

export class JwtAuthGuard extends AuthGuard('access') {
  /**
   * handleRequest를 오버라이드하면 에러를 가로채서 직접 처리하거나 메시지를 커스터마이징할 수 있다.
   *
   * err: 인증 중 발생한 에러 객체
   * user: 인증 성공 시 반환된 사용자 정보
   * info: 인증 실패 시 추가 정보 (예: 토큰 만료, 잘못된 토큰 등의 에러 정보)
   */
  handleRequest(err: Error | null, user: any, info: JsonWebTokenError) {
    if (err || !user) {
      if (info && info.name === 'TokenExpiredError') {
        throw new UnauthorizedException('토큰이 만료되었습니다.');
      } else if (info && info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('토큰이 유효하지 않습니다.');
      }
      throw err || new UnauthorizedException('인증에 실패했습니다.');
    }
    return user;
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'access') {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    super({
      /**
       * jwtFromRequest: Request에서 jwt를 어떻게 추출할지 작성할 수 있다.
       * ExtractJwt: 좀 더 쉽게 토큰을 추출할수 있도록 메서드를 제공한다.
       */
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 여기서 발생하는 예외의 처리를 JwtAuthGuard로 넘긴다.
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(authVariableKeys.accessTokenSecret),
    });
  }

  validate(payload) {
    return payload;
  }
}