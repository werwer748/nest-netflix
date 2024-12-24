import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

//* PrismaClient를 인스턴스화하면 prisma 변수가 된다
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    //* PrismaClient 생성자에는 여러 옵션을 전달할 수 있다.
    super({
      // omit: 전역으로 필드를 제외할 수 있다.
      omit: {
        user: {
          password: true,
        },
      },
    });
  }
  //* onModuleInit 오버라이드 => 모듈이 생성되면 prismaclient에 연결
  async onModuleInit() {
    await this.$connect();
  }
}
