import { Module } from '@nestjs/common';
import { MovieModule } from './movie/movie.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import {
  DB_DATABASE,
  DB_HOST,
  DB_PASSWORD,
  DB_PORT,
  DB_TYPE,
  DB_USERNAME,
} from './movie/common/const/db.const';
import { Movie } from './movie/entity/movie.entity';
import { MovieDetail } from './movie/entity/movie-detail.entity';
import { DirectorModule } from './director/director.module';
import { Director } from './director/entity/director.entity';
import { GenreModule } from './genre/genre.module';
import { Genre } from './genre/entities/genre.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 어떤 모듈에서도 환경변수를 사용할 수 있게 한다.
      validationSchema: Joi.object({
        ENV: Joi.string().valid('dev', 'prod').required(),
        DB_TYPE: Joi.string().valid('postgres').required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().required(),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_DATABASE: Joi.string().required(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      // 비동기로 세팅 및 연결
      useFactory: (configService: ConfigService) => ({
        type: configService.get<string>(DB_TYPE) as 'postgres',
        host: configService.get<string>(DB_HOST),
        port: configService.get<number>(DB_PORT),
        username: configService.get<string>(DB_USERNAME),
        password: configService.get<string>(DB_PASSWORD),
        database: configService.get<string>(DB_DATABASE),
        entities: [
          Movie,
          MovieDetail,
          Director,
          Genre
        ],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    MovieModule,
    DirectorModule,
    GenreModule,
  ], // 다른 모듈을 해당 모듈에서 사용할 떄 등록
  exports: [], // 해당 모듈을 등록한 모듈에서 이곳에 등록한 프로바이더의 기능을 쓸 수 있다.
  controllers: [],
  providers: [],
})
export class AppModule {}
