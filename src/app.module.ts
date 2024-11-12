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
      }),
      inject: [ConfigService],
    }),
    MovieModule,
    DirectorModule,
    GenreModule,
    AuthModule,
    UserModule,
  ], // 다른 모듈을 해당 모듈에서 사용할 떄 등록
  exports: [], // 해당 모듈을 등록한 모듈에서 이곳에 등록한 프로바이더의 기능을 쓸 수 있다.
  controllers: [],
  providers: [],
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
