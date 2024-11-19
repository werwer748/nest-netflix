import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 로그에 대한 설정을 변경할 수 있다.
    // logger: false
    // ['debug']로 설정한 경우 debug 레벨 이상의 로그만 출력된다.
    logger: ['debug'],
    // 커스텀한로그(ConsoleLogger를 상속받은 클래스)를 사용하는 방법
    // logger: new DefaultLogger(),

  });

  //* swagger 세팅하기
  const config = new DocumentBuilder()
    .setTitle('코드팩토리 넷플릭스')
    .setDescription('NestJS 강좌를 수강중입니다.')
    // 문서의 버전을 명시 - api 버전과는 다름(버전별로 따로 스웨거를 띄우는게 가능하다고 함)
    .setVersion('1.0')
    // Basic Auth (Base64 인코딩 로그인 로직)
    .addBasicAuth()
    // Bearer Auth (JWT 토큰 로그인 로직)
    .addBearerAuth()
    .build();
  //* 스웨거 문서를 생성
  const document = SwaggerModule.createDocument(app, config);
  //* /doc 경로로 접속하면 스웨거 문서를 볼 수 있다.
  SwaggerModule.setup('doc', app, document, {
    swaggerOptions: {
      // 새로고침해도 스웨거인증(로그인) 유지
      persistAuthorization: true,
    }
  });

  // 모든 요청에 기본적인 prefix를 추가할 수 있다.
  // app.setGlobalPrefix('v1')

  //* api 버전이 바뀔 때 편하게 사용할 수 있는 방법
  //* URI Versioning
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   // 단일 사용시 문자열, 여러 버전을 둘 때는 []
  //   // defaultVersion: ['1', '2'] // 요청시 URL에 v1, v2를 붙여서 요청해야 함
  // });

  //* Header Versioning
  // app.enableVersioning({
  //   type: VersioningType.HEADER,
  //   // 헤더에 버전을 담을 키의 이름을 설정
  //   header: 'version'
  // });

  //* Media Type Versioning
  // app.enableVersioning({
  //   type: VersioningType.MEDIA_TYPE,
  //   // 미디어타입 벨류 뒤쪽에 쿼리처럼 붙어서 오는 버전의 키
  //   key: 'v=',
  // });


  // winston을 사용한 로깅을 위한 설정
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

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
