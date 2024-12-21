import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MovieModule } from './movie/movie.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConditionalModule, ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { dbVariableKeys } from './common/const/db.const';
import { Movie } from './movie/entity/movie.entity';
import { MovieDetail } from './movie/entity/movie-detail.entity';
import { DirectorModule } from './director/director.module';
import { Director } from './director/entity/director.entity';
import { GenreModule } from './genre/genre.module';
import { Genre } from './genre/entity/genre.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { User } from './user/entity/user.entity';
import { BearerTokenMiddleware } from './auth/middleware/bearer-token.middleware';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/guard/auth.guard';
import { RBACGuard } from './auth/guard/rbac.guard';
import { ResponseTimeInterceptor } from './common/interceptor/response-time.interceptor';
import { QueryFailedExceptionFilter } from './common/filter/query-failed.filter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { MovieUserLike } from './movie/entity/movie-user-like.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottleInterceptor } from './common/interceptor/throttle.interceptor';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
// winston을 import
import * as winston from 'winston';
import { envVariableKeys } from './common/const/env.const';
import { ChatModule } from './chat/chat.module';
import { Chat } from './chat/entity/chat.entity';
import { ChatRoom } from './chat/entity/chat-room.entity';
import { WorkerModule } from './worker/worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      //? 환경변수 파일 이름 오른쪽 파일 기준으로 중복값은 덮어 씌운다.
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      isGlobal: true, // 어떤 모듈에서도 환경변수를 사용할 수 있게 한다.
      validationSchema: Joi.object({
        ENV: Joi.string().valid('test', 'dev', 'prod').required(),
        DB_TYPE: Joi.string().valid('postgres').required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
        //* prisma url
        DB_URL: Joi.string().required(),
        HASH_ROUNDS: Joi.number().required(),
        ACCESS_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
        AWS_SECRET_ACCESS_KEY: Joi.string().required(),
        AWS_ACCESS_KEY_ID: Joi.string().required(),
        AWS_REGION: Joi.string().required(),
        BUCKET_NAME: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.string().required(),
        REDIS_USERNAME: Joi.string().required(),
        REDIS_PASSWORD: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      // 비동기로 세팅 및 연결
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>(dbVariableKeys.dbUrl),
        // 기존 세팅 유지
        type: configService.get<string>(dbVariableKeys.dbType) as 'postgres',
        host: configService.get<string>(dbVariableKeys.dbHost),
        port: configService.get<number>(dbVariableKeys.dbPort),
        username: configService.get<string>(dbVariableKeys.dbUsername),
        password: configService.get<string>(dbVariableKeys.dbPassword),
        database: configService.get<string>(dbVariableKeys.dbDatabase),
        entities: [
          Movie,
          MovieDetail,
          Director,
          Genre,
          User,
          MovieUserLike,
          Chat,
          ChatRoom,
        ],
        synchronize: configService.get<string>(envVariableKeys.env) !== 'prod',
        // synchronize: true,
        // logging: true,
        // env가 test라면 DB를 깨끗이 지우고 시작
        dropSchema: configService.get<string>(envVariableKeys.env) === 'test',
        // DB 보안 설정 - 일단은 false로 설정
        ...(configService.get<string>(envVariableKeys.env) === 'prod' && {
          ssl: {
            rejectUnauthorized: false,
          },
        }),
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      /**
       * rootPath: 스태틱파일 루트 경로
       * static file을 제공할 root path
       * 요청 경로에 public은 빠져야 한다.
       * => GET (/public => 여기 없이 요청해야하는 것)/movie/1.mp4
       * => GET /movie/1.mp4 이렇게 요청하게 되는데 이러면 MovieController 라우트들과 충돌
       *
       * serveRoot: 서빙할 스태틱파일의 루트 경로
       * 요청경로에 public이 붙으면 rootPath에 있는 파일을 제공한다.
       */
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/public/',
    }),
    CacheModule.register({
      //* 캐시모듈 등록에서 ttl 설정이 가능 - milisecond
      ttl: 0,
      //* isGlobal: true로 전역 설정
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    WinstonModule.forRoot({
      // 로깅 레벨 설정
      level: 'debug',
      // 로그를 어디로 출력할지 설정
      transports: [
        // Console에 출력하는 방법 설정
        new winston.transports.Console({
          format: winston.format.combine(
            // 로그 색상 처리
            winston.format.colorize({ all: true }),
            // formant.printf에 timestamp를 전달
            winston.format.timestamp(),
            // 로그 출력 형식 -> info: [Object object]
            winston.format.printf(
              (info) =>
                `${info.timestamp} [${info.context}] ${info.level}: ${info.message}`,
            ),
          ),
        }),
        // 파일을 남기는 방법을 설정
        new winston.transports.File({
          dirname: join(process.cwd(), 'logs'),
          filename: 'logs.log',
          format: winston.format.combine(
            // 로그 색상이 파일로 남기면 이상한 문자열로 처리되서 주석
            // winston.format.colorize({ all: true }),

            // formant.printf에 timestamp를 전달
            winston.format.timestamp(),
            // 로그 출력 형식 -> info: [Object object]
            winston.format.printf(
              (info) =>
                `${info.timestamp} [${info.context}] ${info.level}: ${info.message}`,
            ),
          ),
        }),
      ],
    }),
    MovieModule,
    DirectorModule,
    GenreModule,
    AuthModule,
    UserModule,
    ChatModule,
    /**
     * WorkerModule을 AppModule에 등록
     * 그런데 이렇게만 등록되어있으면 컨슈머 서버인지 프로듀서 서버인지 구분이 안된다.
     * 컨슈머 작업을 모든 서버가 들고있을 필요가 없음
     * 그래서 구분을 위해 조건을 통해 WorkerModule이 등록되도록 설정
     * @nestjs/config의 ConditionalModule을 사용
     */
    ConditionalModule.registerWhen(
      WorkerModule,
      (env: NodeJS.ProcessEnv) => env['TYPE'] === 'worker',
    ),
  ], // 다른 모듈을 해당 모듈에서 사용할 떄 등록
  exports: [], // 해당 모듈을 등록한 모듈에서 이곳에 등록한 프로바이더의 기능을 쓸 수 있다.
  controllers: [],
  providers: [
    // 적용된 순서대로 실행된다.
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RBACGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTimeInterceptor,
    },
    // { // 요청횟수초과용 Forbidden 에러 확인을 위해 주석처리
    //   provide: APP_FILTER,
    //   useClass: ForbiddenExceptionFilter
    // },
    {
      provide: APP_FILTER,
      useClass: QueryFailedExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ThrottleInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        // 사용할 미들웨어를 등록
        BearerTokenMiddleware,
      )
      // 미들웨어 적용을 원하지 않는 경로
      // auth로 시작하는 모든 경로는 제외
      // .exclude({
      //   path: 'auth/(.*)',
      //   method: RequestMethod.ALL,
      // })
      .exclude(
        {
          path: 'auth/register',
          method: RequestMethod.POST,
        },
        {
          path: 'auth/login',
          method: RequestMethod.POST,
        },
      )
      // 모든 경로에 적용
      .forRoutes('*');
  }
}
