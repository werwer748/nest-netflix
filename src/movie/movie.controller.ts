import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query, Req,
  UploadedFile, UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MovieService } from './movie.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { MovieTitleValidationPipe } from './pipe/movie-title-validation.pipe';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Public } from '../auth/decorator/public.decorator';
import { RBAC } from '../auth/decorator/rbac.decorator';
import { Role } from '../user/entities/user.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CacheInterceptor } from '../common/interceptor/cache.interceptor';
import { TransactionInterceptor } from '../common/interceptor/transaction.interceptor';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { MovieFilePipe } from './pipe/movie-file.pipe';

@Controller('movie')
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Public()
  @Get()
  getMovies(@Query() dto: GetMoviesDto) {
    // console.log(req.user);
    return this.movieService.findAll(dto);
  }

  @Public()
  @Get(':id')
  getMovie(
    //* 기본적인 pipe 사용법 - 라우트 메서드 적용
    // @Param('id', ParseIntPipe) id: number
    //* pipe에 대한 커스텀 에러 처리
    @Param(
      'id',
      new ParseIntPipe({
        exceptionFactory(error) {
          throw new BadRequestException('id는 숫자여야 합니다.');
        },
      }),
    )
    id: number,
  ) {
    return this.movieService.findOne(id);
  }

  @Post()
  @RBAC([Role.admin])
  @UseGuards(AuthGuard)
  @UseInterceptors(TransactionInterceptor)
  @UseInterceptors(
    FileInterceptor(
      'movie',
      {
        limits: {
          fileSize: 20000000, // 20MB
        },
        fileFilter(
          req: any,
          file: {
            fieldname: string;
            originalname: string;
            encoding: string;
            mimetype: string;
            size: number;
            destination: string;
            filename: string;
            path: string;
            buffer: Buffer;
          },
          // acceptFile: boolean => true: 파일 저장, false: 파일 저장 안함
          callback: (error: Error | null, acceptFile: boolean) => void,
        ) {
          console.log(file);

          if (file.mimetype !== 'video/mp4') {
            return callback(
              new BadRequestException('mp4 파일만 업로드 가능합니다.'),
              false,
            )
          }

          return callback(null, true);
        },
      },
    ),
  )
  postMovie(
    @Req() req,
    @Body() body: CreateMovieDto,
    @UploadedFile() movie: Express.Multer.File,
  ) {
    console.log('===================================');
    console.log(movie);
    console.log('===================================');
    return this.movieService.create(body, req.queryRunner);
  }

  @Patch(':id')
  @RBAC([Role.admin])
  patchMovie(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMovieDto,
  ) {
    return this.movieService.update(id, body);
  }

  @Delete(':id')
  @RBAC([Role.admin])
  deleteMovie(@Param('id', ParseIntPipe) id: number) {
    return this.movieService.delete(id);
  }
}
