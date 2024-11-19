import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 로그에 대한 설정을 변경할 수 있다.
    // logger: false
    // ['debug']로 설정한 경우 debug 레벨 이상의 로그만 출력된다.
    logger: ['debug'],
    // 커스텀한로그(ConsoleLogger를 상속받은 클래스)를 사용하는 방법
    // logger: new DefaultLogger(),

  });

  app.useGlobalPipes(
    new ValidationPipe({
      /**
       * whitelist
       * default: false
       * true
       * => dto에 정의되지 않은 속성이 들어오면 제거
       */
      whitelist: true,
      /**
       * forbidNonWhitelisted
       * default: false
       * true
       * => whitelist가 true일 때만 동작,
       * dto에 정의되지 않은 속성이 들어오면 에러를 발생 시킨다.
       */
      forbidNonWhitelisted: true,
      /**
       * transform
       * default: false
       * true
       * => 요청의 JSON을 자동으로 DTO 클래스의 인스턴스로 변환합니다.
       * 이를 통해 컨트롤러에서 요청 객체를 구체적인 DTO 타입으로 사용할 수 있습니다.
       */
      // transform: true,
      /**
       * transformOptions
       * => 요청을 dto클래스로 받을 때 변환 옵션
       *
       * enableImplicitConversion
       * : 요청객체의 프로퍼티 타입을 dto의 타입으로 자동 변환할지 선택
       * trnasform 옵션이
       * false 여도 일부 간단한 타입변환은 자동으로 처리되기도 한다.
       */
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  )

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
