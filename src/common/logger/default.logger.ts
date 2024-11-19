import { ConsoleLogger, Injectable } from '@nestjs/common';


/**
 * ConsoleLogger를 상속받는 클래스를 만들면
 * 특정 레벨의 로깅이 발생할 때
 * 추가로 다양한 작업을 할 수 있다.
 */
@Injectable()
export class DefaultLogger extends ConsoleLogger {
  // warning 레벨의 로깅이 생길 때 마다 특정작업을 하고싶다면 이렇게 처리할 수 도 있다.
  warn(message: unknown, ...rest: unknown[]) {
    // 오버라이드 됐는지만 확인
    console.log('==== WARN LOG ====');
    super.warn(message, ...rest);
  }

  error(message: any, stackOrContext?: string) {
    console.log('==== ERROR LOG ====');
    super.error(message, stackOrContext);
  }

  log(message: any, context?: string) {
    console.log('==== 끼약!! ====');
    super.log(message, context);
  }
}