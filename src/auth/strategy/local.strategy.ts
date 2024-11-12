import { AuthGuard, PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

// export class LocalAuthGuard extends AuthGuard('codefactory') {}
export class LocalAuthGuard extends AuthGuard('local') {}

@Injectable()
//* PassportStrategy(구현할 전략, 전략 명칭 - 해당전략을 사용할 때 여기서 지정한 이름으로 사용 가능)
// export class LocalStrategy extends PassportStrategy(Strategy, 'codefactory') {
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    // 모든 전략은 super()를 호출해야 한다.
    // -> 전략에 super의 파라미터에 시크릿값을 전달하거나 하는식으로 사용됨
    super({
      // usernameField와 passwordField는
      // Request()에서 받는 필드의 이름을 지정한다
      usernameField: 'email',
      passwordField: 'password'
    });
  }

  /**
   * 거의 모든 Stratege는 validate() 메서드를 구현해야 한다.
   *
   * LocalStrategy는 username과 password를 받아서
   * 유저를 찾아서 유효성을 검사하는 역할을 한다.
   *
   * return하는 값을 Request()에서 받을 수 있다.
   */
  async validate(email: string, password: string) {
    const user = await this.authService.authenticate(email, password);

    return user;
  }
}