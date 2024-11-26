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
  Query,
  UseGuards,
  UseInterceptors,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { MovieService } from './movie.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { Public } from '../auth/decorator/public.decorator';
import { RBAC } from '../auth/decorator/rbac.decorator';
import { Role } from '../user/entity/user.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { TransactionInterceptor } from '../common/interceptor/transaction.interceptor';
import { UserId } from '../user/decorator/user-id.decorator';
import { QueryRuunerDeco } from '../common/decorator/query-runner.decorator';
import { QueryRunner } from 'typeorm';
import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { ThrottleDecorator } from '../common/decorator/throttle.decorator';
import {
  ApiBearerAuth,
  ApiExcludeController,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('movie')
@ApiBearerAuth()
@ApiTags('movie')
// @ApiExcludeController()
@UseInterceptors(ClassSerializerInterceptor)
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Get()
  @Public()
  @ThrottleDecorator({
    count: 5,
    unit: 'minute',
  })
  @ApiOperation({
    description: '[Movie] 를 Pagination 하는 API',
  })
  @ApiResponse({
    status: 200,
    description: '성공',
  })
  @ApiResponse({
    status: 400,
    description: 'Pagination 파라미터 잘못입력했을때',
  })
  getMovies(@Query() dto: GetMoviesDto, @UserId() userId?: number) {
    // console.log(req.user);
    return this.movieService.findAll(dto, userId);
  }

  @Get('recent')
  /**
   * CacheInterceptor => '@nestjs/cache-manager'
   * 자동으로 해당 라우트의 응답을 캐싱해준다.
   * 쿼리 파라미터가 바뀌면 다른 캐시데이터로 저장하고 불러온다.
   * 설정은 기본적으로 CacheModule.register()의 설정을 가져온다.
   * => 컨트롤러단에 사용해서 모든 요청에 적용할 수도 있다
   */
  @UseInterceptors(CacheInterceptor)
  /**
   * CacheKey => '@nestjs/cache-manager'
   * 캐시키를 설정해서 해당 요청으로 들어오는 모든 데이터를
   * 이 캐시키 하나로 관리함
   * 즉 해당 요청은 ttl시간동안 같은 데이터를 보여준다.
   * 쿼리 파라미터가 바뀌어도 getMoviesRecent키에만 저장된다.
   */
  @CacheKey('getMoviesRecent')
  /**
   * CacheTTL => '@nestjs/cache-manager'
   * 캐시의 유지시간을 어노테이션으로 설정할 수 있다.
   * milisecond 단위로 설정한다.
   * => 1000ms = 1초
   */
  @CacheTTL(1000)
  getMoviesRecent() {
    return this.movieService.findRecent();
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
  postMovie(
    @QueryRuunerDeco() qr: QueryRunner,
    @Body() body: CreateMovieDto,
    @UserId() userId: number,
  ) {
    return this.movieService.create(body, userId, qr);
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

  //* 좋아요!
  // @ApiExcludeEndpoint()
  @Post(':id/like')
  createMovieLike(
    @Param('id', ParseIntPipe) movieId: number,
    @UserId() userId: number,
  ) {
    return this.movieService.toggleMovieLike(movieId, userId, true);
  }
  //* 별로에요!
  @Post(':id/dislike')
  createMovieDisLike(
    @Param('id', ParseIntPipe) movieId: number,
    @UserId() userId: number,
  ) {
    return this.movieService.toggleMovieLike(movieId, userId, false);
  }
}
