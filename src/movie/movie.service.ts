import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from '../director/entity/director.entity';
import { Genre } from '../genre/entities/genre.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CommonService } from '../common/common.service';
import { join } from 'path';
import { rename } from 'fs/promises';
import { User } from '../user/entities/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
    @InjectRepository(MovieDetail)
    private readonly movieDetailRepository: Repository<MovieDetail>,
    @InjectRepository(Director)
    private readonly directorRepository: Repository<Director>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MovieUserLike)
    private readonly movieUserLikeRepository: Repository<MovieUserLike>,
    //* typeorm에서 import
    private readonly dataSource: DataSource,
    private readonly commonService: CommonService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findRecent() {
    /**
     * 캐시 기본 사용법
     * // number라는 키에 10이라는 값을 저장
     * // 저장시간(TTL)을 지정안하고 set하면 데이터가 금방 사라진다.
     * await this.cacheManager.set('number', 10);
     *
     * // number라는 키에 저장된 값을 가져온다.
     * const data = await this.cacheManager.get('number'); // 10
     */

    const cacheData = await this.cacheManager.get('MOVIE_RECENT');

    if (cacheData) {
      return cacheData;
    }

    const data = await this.movieRepository.find({
      order: {
        createdAt: 'DESC',
      },
      take: 10,
    });

    // TTL을 0으로 설정하면 영구적으로 저장된다. - 서비스 단에서도 그때 그때 TTL을 설정할 수 있다.
    // 이 경우 모듈 등록의 설정을 덮어 씌운다.
    await this.cacheManager.set('MOVIE_RECENT', data);

    return data;
  }

  async findAll(dto: GetMoviesDto, userId?: number) {
    const { title } = dto;

    //* Query Builder
    const qb = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres');

    if (title) {
      qb.where('movie.title LIKE :title', { title: `%${title}%` });
    }

    const count = await qb.getCount();

    // this.commonService.applyPagePaginationParamsToQb(qb, dto);
    // this.commonService.applyCursorPaginationParamsToQb(qb, dto);
    let { nextCursor, data } =
      await this.commonService.applyCursorPaginationParamsToQb(qb, dto);

    if (userId) {
      const movieIds = data.map((movie) => movie.id);

      const likedMovies =
        movieIds.length < 1
          ? []
          : await this.getLikedMovies(movieIds, userId);

      const likedMovieMap = likedMovies.reduce(
        (acc, next) => ({
          ...acc,
          [next.movie.id]: next.isLike,
        }),
        {},
      );

      data = data.map((movie) => ({
        ...movie,
        // null || true || false
        likeStatus: likedMovieMap[movie.id] ?? null,
      }));
    }

    return {
      data,
      count,
      nextCursor,
    };
  }

  private async getLikedMovies(movieIds: number[], userId: number) {
    return await this.movieUserLikeRepository
      .createQueryBuilder('mul')
      .leftJoinAndSelect('mul.movie', 'movie')
      .leftJoinAndSelect('mul.user', 'user')
      // ...movieIds를 하면 배열을 ,로 나눠서 넣어준다.
      .where('movie.id IN (:...movieIds)', { movieIds })
      .andWhere('user.id = :userId', { userId })
      .getMany();
  }

  async findOne(id: number) {
    try {
      const movie = await this.movieRepository
        .createQueryBuilder('movie')
        .leftJoinAndSelect('movie.director', 'director')
        .leftJoinAndSelect('movie.genres', 'genres')
        .leftJoinAndSelect('movie.detail', 'detail')
        .leftJoinAndSelect('movie.creator', 'creator')
        .where('movie.id = :id', { id })
        .getOne();

      if (!movie) {
        throw new NotFoundException('그 영화 없어요');
      }

      return movie;
    } catch (e) {
      throw e;
    }
  }

  async create(
    createMovieDto: CreateMovieDto,
    userId: number,
    qr: QueryRunner,
  ) {
    //* 쿼리러너의 매니저를 통해 트랜잭션을 사용 - 실행함수에 첫번째 인자로 엔티티를 넣어준다.
    const director = await qr.manager.findOne(Director, {
      where: {
        id: createMovieDto.directorId,
      },
    });

    if (!director) {
      throw new NotFoundException('존재하지 않는 감독입니다!');
    }

    const genres = await qr.manager.find(Genre, {
      where: {
        id: In(createMovieDto.genreIds),
      },
    });

    if (genres.length !== createMovieDto.genreIds.length) {
      throw new NotFoundException(
        `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`,
      );
    }

    //* 메니저를 통해 쿼리빌더를 수행한경우는 엔티티를 명시하지않아도 됨
    //* => 어차피 쿼리빌더내에 체이닝 메서드에 엔티티를 명시해야하기 때문
    const movieDetail = await qr.manager
      .createQueryBuilder()
      .insert()
      .into(MovieDetail)
      .values({
        detail: createMovieDto.detail,
      })
      .execute();

    // => 생성한 movieDetail의 id를 가져온다.
    const movieDetailId = movieDetail.identifiers[0].id;

    const movieFolder = join('public', 'movie');
    const tempFolder = join('public', 'temp');

    const movie = await qr.manager
      .createQueryBuilder()
      .insert()
      .into(Movie)
      .values({
        title: createMovieDto.title,
        // => 따로 생성한 movieDetail의 id를 넣어준다.
        detail: {
          id: movieDetailId,
        },
        director,
        creator: {
          id: userId,
        },
        movieFilePath: join(movieFolder, createMovieDto.movieFileName),
      })
      .execute();

    // => 생성한 movie의 id를 가져온다.
    const movieId = movie.identifiers[0].id;

    // => 실질적 관계 맵핑
    await qr.manager
      .createQueryBuilder()
      .relation(Movie, 'genres')
      .of(movieId)
      .add(genres.map((genre) => genre.id));

    await rename(
      join(process.cwd(), tempFolder, createMovieDto.movieFileName), // 여기있는걸
      join(process.cwd(), movieFolder, createMovieDto.movieFileName), // 여기로 옮긴다.
    );

    // 컨트롤러 전체에 인터셉터로 트랜잭션을 적용했기 떄문에 쿼리러너로 모든 로직을 처리해야한다.
    return await qr.manager.findOne(Movie, {
      where: {
        id: movieId,
      },
      relations: ['detail', 'director', 'genres'],
    });
  }

  async update(id: number, updateMovieDto: UpdateMovieDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const movie = await qr.manager.findOne(Movie, {
        where: {
          id,
        },
        relations: ['detail', 'genres'],
      });

      if (!movie) {
        throw new NotFoundException('그 영화 없어요');
      }

      const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

      let newDirector;

      if (directorId) {
        const director = await qr.manager.findOne(Director, {
          where: {
            id: directorId,
          },
        });

        if (!director) {
          throw new NotFoundException('존재하지 않는 감독입니다!');
        }

        newDirector = director;
      }

      let newGenres;

      if (genreIds) {
        const genres = await qr.manager.findBy(Genre, { id: In(genreIds) });

        if (genres.length !== genreIds.length) {
          throw new NotFoundException(
            `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`,
          );
        }

        newGenres = genres;
      }

      const movieUpdateFields = {
        ...movieRest,
        ...(newDirector && { director: newDirector }),
      };

      //* Query Builder로 업데이트
      await qr.manager
        .createQueryBuilder()
        .update(Movie)
        .set(movieUpdateFields)
        .where('id = :id', { id })
        .execute();

      if (detail) {
        await qr.manager
          .createQueryBuilder()
          .update(MovieDetail)
          .set({ detail })
          .where('id = :id', { id: movie.detail.id })
          .execute();
      }

      if (newGenres) {
        await qr.manager
          .createQueryBuilder()
          .relation(Movie, 'genres')
          .of(id)
          // addAndRemove(추가할 id 배열, 제거할 id 배열)
          .addAndRemove(
            // 업데이트 요청에 들어온 장르 id - 전부 등록
            newGenres.map((genre) => genre.id),
            // 기존 영화의 장르 id - 전부 삭제
            movie.genres.map((genre) => genre.id),
          );
      }

      await qr.commitTransaction();

      return this.movieRepository.findOne({
        where: {
          id,
        },
        relations: ['detail', 'director', 'genres'],
      });
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  async delete(id: number) {
    const movieDetail = await this.movieDetailRepository.findOne({
      where: {
        movie: {
          id,
        },
      },
    });

    if (!movieDetail) {
      throw new NotFoundException('그 영화 없어요');
    }

    // await this.movieRepository.createQueryBuilder()
    //   .delete()
    //   .where('id = :id', { id })
    //   .execute();

    await this.movieDetailRepository.remove(movieDetail);

    return id;
  }

  async toggleMovieLike(movieId: number, userId: number, isLike: boolean) {
    const movie = await this.movieRepository.findOne({
      where: {
        id: movieId,
      },
    });

    if (!movie) {
      throw new NotFoundException('그 영화 없어요');
    }

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('사용자 정보가 없어요');
    }

    const likeRecord = await this.movieUserLikeRepository
      .createQueryBuilder('mul')
      .leftJoinAndSelect('mul.movie', 'movie')
      .leftJoinAndSelect('mul.user', 'user')
      .where('movie.id = :movieId', { movieId })
      .andWhere('user.id = :userId', { userId })
      .getOne();

    if (likeRecord) {
      if (isLike === likeRecord.isLike) {
        await this.movieUserLikeRepository.delete({ movie, user });
      } else {
        await this.movieUserLikeRepository.update({ movie, user }, { isLike });
      }
    } else {
      await this.movieUserLikeRepository.save({
        movie,
        user,
        isLike,
      });
    }

    const result = await this.movieUserLikeRepository
      .createQueryBuilder('mul')
      .leftJoinAndSelect('mul.movie', 'movie')
      .leftJoinAndSelect('mul.user', 'user')
      .where('movie.id = :movieId', { movieId })
      .andWhere('user.id = :userId', { userId })
      .getOne();

    console.log('result', result);

    return {
      isLike: result && result.isLike,
    };
  }
}
