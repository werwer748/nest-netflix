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
import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthorizationDecorator } from './decorator/authorization.decorator';

@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
@ApiTags('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @ApiBasicAuth() // 요청의 헤더에 Basic 토큰을 실어준다.
  @Post('register')
  registerUser(
    // authorization: Basic ${token}
    @AuthorizationDecorator() token: string,
  ) {
    return this.authService.register(token);
  }

  @Public()
  @ApiBasicAuth()
  @Post('login')
  loginUser(@AuthorizationDecorator() token: string) {
    return this.authService.login(token);
  }

  @Post('token/block')
  blockToken(@Body('token') token: string) {
    return this.authService.tokenBlock(token);
  }

  @Post('token/access')
  // async rotateAccessToken(@Req() req: IReqestUser) {
  async rotateAccessToken(@Req() req) {
    return {
      accessToken: await this.authService.issueToken(req.user, false),
    };
  }

  @Post('login/passport')
  // 내가 지정한 전략이름으로 사용하는 경우
  // @UseGuards(AuthGuard('codefactory'))
  //* 'local' 전략을 사용하는 가드를 상속하는 가드를 만들어서 사용할 수 있다.
  @UseGuards(LocalAuthGuard)
  // async loginUserPassport(@Req() req: IReqestUser) {
  async loginUserPassport(@Req() req) {
    return {
      accessToken: await this.authService.issueToken(req.user, false),
      refreshToken: await this.authService.issueToken(req.user, true),
    };
  }

  // jwt 인가 테스트용
  // @Get('private')
  // @UseGuards(JwtAuthGuard)
  // private(@Req() req) {
  //   return req.user;
  // }
}
