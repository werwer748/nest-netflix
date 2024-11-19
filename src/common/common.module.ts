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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Movie
    ]),
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
      })
    }),
  ],
  controllers: [CommonController],
  providers: [CommonService, TasksService],
  exports: [CommonService],
})
export class CommonModule {}