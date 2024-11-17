import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MovieModule } from './movie/movie.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { dbVariableKeys } from './common/const/db.const';
import { Movie } from './movie/entity/movie.entity';
import { MovieDetail } from './movie/entity/movie-detail.entity';
import { DirectorModule } from './director/director.module';
import { Director } from './director/entity/director.entity';
import { GenreModule } from './genre/genre.module';
import { Genre } from './genre/entities/genre.entity';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { User } from './user/entities/user.entity';
import { BearerTokenMiddleware } from './auth/middleware/bearer-token.middleware';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './auth/guard/auth.guard';
import { RBACGuard } from './auth/guard/rbac.guard';
import { ResponseTimeInterceptor } from './common/interceptor/response-time.interceptor';
import { ForbiddenExceptionFilter } from './common/filter/forbidden.filter';
import { QueryFailedExceptionFilter } from './common/filter/query-failed.filter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      //? 환경변수 파일 이름 오른쪽 파일 기준으로 중복값은 덮어 씌운다.
      envFilePath: ['.env.dev', '.env.prod', '.env'],
      isGlobal: true, // 어떤 모듈에서도 환경변수를 사용할 수 있게 한다.
      validationSchema: Joi.object({
        ENV: Joi.string().valid('dev', 'prod').required(),
        DB_TYPE: Joi.string().valid('postgres').required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
        HASH_ROUNDS: Joi.number().required(),
        ACCESS_TOKEN_SECRET: Joi.string().required(),
        REFRESH_TOKEN_SECRET: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      // 비동기로 세팅 및 연결
      useFactory: (configService: ConfigService) => ({
        type: configService.get<string>(dbVariableKeys.dbType) as 'postgres',
        host: configService.get<string>(dbVariableKeys.dbHost),
        port: configService.get<number>(dbVariableKeys.dbPort),
        username: configService.get<string>(dbVariableKeys.dbUsername),
        password: configService.get<string>(dbVariableKeys.dbPassword),
        database: configService.get<string>(dbVariableKeys.dbDatabase),
        entities: [Movie, MovieDetail, Director, Genre, User],
        synchronize: true,
        // logging: true,
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
    MovieModule,
    DirectorModule,
    GenreModule,
    AuthModule,
    UserModule
  ], // 다른 모듈을 해당 모듈에서 사용할 떄 등록
  exports: [], // 해당 모듈을 등록한 모듈에서 이곳에 등록한 프로바이더의 기능을 쓸 수 있다.
  controllers: [],
  providers: [
    // 적용된 순서대로 실행된다.
    {
      provide: APP_GUARD,
      useClass: AuthGuard
    },
    {
      provide: APP_GUARD,
      useClass: RBACGuard
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTimeInterceptor
    },
    {
      provide: APP_FILTER,
      useClass: ForbiddenExceptionFilter
    },
    {
      provide: APP_FILTER,
      useClass: QueryFailedExceptionFilter
    }
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
