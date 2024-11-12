import {
  Controller,
  Post,
  Headers,
  UseInterceptors,
  ClassSerializerInterceptor,
  Req,
  UseGuards,
  Get, UseFilters,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../user/entities/user.entity';
import { LocalAuthGuard } from './strategy/local.strategy';
import { JwtAuthGuard } from './strategy/jwt.strategy';
import { JwtExpiredExceptionFilter } from '../common/exception/jwt-expired.exception.filter';
import { IReqestUser } from './interfaces/request-user.interface';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  registerUser(
    // authorization: Basic ${token}
    @Headers('authorization') token: string,
  ) {
    return this.authService.register(token);
  }

  @Post('login')
  loginUser(
    @Headers('authorization') token: string,
  ) {
    return this.authService.login(token);
  }

  @Post('token/access')
  async rotateAccessToken(
    @Req() req: IReqestUser,
  ) {
    return {
      accessToken: await this.authService.issueToken(req.user, false),
    }
  }

  @Post('login/passport')
  // 내가 지정한 전략이름으로 사용하는 경우
  // @UseGuards(AuthGuard('codefactory'))
  //* 'local' 전략을 사용하는 가드를 상속하는 가드를 만들어서 사용할 수 있다.
  @UseGuards(LocalAuthGuard)
  async loginUserPassport(@Req() req: IReqestUser) {
    return {
      accessToken: await this.authService.issueToken(req.user, false),
      refreshToken: await this.authService.issueToken(req.user, true),
    }
  }

  // jwt 인가 테스트용
  @Get('private')
  @UseGuards(JwtAuthGuard)
  private(
    @Req() req
  ) {
    return req.user;
  }
}
