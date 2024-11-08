import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      /**
       * whitelist
       * default: false
       * true
       * => dto에 정의되지 않은 속성이 들어오면 제거
       */
      whitelist: false,
      /**
       * forbidNonWhitelisted
       * default: false
       * true
       * => dto에 정의되지 않은 속성이 들어오면 에러를 발생 시킨다.
       */
      forbidNonWhitelisted: true,
    })
  )

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
