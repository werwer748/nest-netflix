import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { CommonController } from './common.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { v4 } from 'uuid';
import { TasksService } from './tasks.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from '../movie/entity/movie.entity';
import { DefaultLogger } from './logger/default.logger';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { redisVariableKeys } from './const/redis.const';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movie]),
    MulterModule.register({
      storage: diskStorage({
        // process.cwd(): 현재 프로젝트의 root directory
        destination: join(process.cwd(), 'public', 'temp'),
        filename(
          req,
          file: Express.Multer.File,
          callback: (error: Error | null, filename: string) => void,
        ) {
          const split = file.originalname.split('.');

          let extension = 'mp4';

          if (split.length > 1) {
            extension = split.at(-1);
          }

          //* callback(에러, 파일명)
          callback(null, `${v4()}_${Date.now()}.${extension}`);
        },
      }),
    }),
    //* Redis에 작업을 올릴 수 있도록 BullMq 설정
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>(redisVariableKeys.redisHost),
          port: configService.get<number>(redisVariableKeys.redisPort),
          username: configService.get<string>(redisVariableKeys.redisUsername),
          password: configService.get<string>(redisVariableKeys.redisPassword),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      //* 큐의 작업 이름을 지정
      name: 'thumbnail-generation',
    }),
  ],
  controllers: [CommonController],
  providers: [CommonService, TasksService, DefaultLogger, PrismaService],
  exports: [CommonService, DefaultLogger, PrismaService],
})
export class CommonModule {}
