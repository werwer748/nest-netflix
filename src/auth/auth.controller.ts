import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './strategy/local.strategy';
import { JwtAuthGuard } from './strategy/jwt.strategy';
import { IReqestUser } from './interfaces/request-user.interface';
import { Public } from './decorator/public.decorator';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  registerUser(
    // authorization: Basic ${token}
    @Headers('authorization') token: string,
  ) {
    return this.authService.register(token);
  }

  @Public()
  @Post('login')
  loginUser(@Headers('authorization') token: string) {
    return this.authService.login(token);
  }

  @Post('token/block')
  blockToken(
    @Body('token') token: string,
  ) {
    return this.authService.tokenBock(token);
  }

  @Post('token/access')
  async rotateAccessToken(@Req() req: IReqestUser) {
    return {
      accessToken: await this.authService.issueToken(req.user, false),
    };
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
    };
  }

  // jwt 인가 테스트용
  @Get('private')
  @UseGuards(JwtAuthGuard)
  private(@Req() req) {
    return req.user;
  }
}
