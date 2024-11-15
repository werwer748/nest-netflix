import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from '../director/entity/director.entity';
import { Genre } from '../genre/entities/genre.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CommonService } from '../common/common.service';

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
    //* typeorm에서 import
    private readonly dataSource: DataSource,
    private readonly commonService: CommonService,
  ) {}

  async findAll(dto: GetMoviesDto) {
    const { title } = dto;

    //* Query Builder
    const qb = this.movieRepository
      .createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres');

    if (title) {
      qb.where('movie.title LIKE :title', { title: `%${title}%` });
    }

    const count = await qb.getCount()

    // this.commonService.applyPagePaginationParamsToQb(qb, dto);
    // this.commonService.applyCursorPaginationParamsToQb(qb, dto);
    const { nextCursor, data } = await this.commonService.applyCursorPaginationParamsToQb(qb, dto);

    // const [data, count] = await qb.getManyAndCount();

    return {
      data,
      count,
      nextCursor,
    }
  }

  async findOne(id: number) {
    try {
      const movie = await this.movieRepository
        .createQueryBuilder('movie')
        .leftJoinAndSelect('movie.director', 'director')
        .leftJoinAndSelect('movie.genres', 'genres')
        .leftJoinAndSelect('movie.detail', 'detail')
        .where('movie.id = :id', { id })
        .getOne();

      if (!movie) {
        throw new NotFoundException('그 영화 없어요');
      }

      return movie;
    } catch(e) { throw e; }
  }

  async create(createMovieDto: CreateMovieDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    // startTransaction('isolation level') => 파라미터 없을시 DB 기본 설정
    await qr.startTransaction();

    try {
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
        }
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

      await qr.commitTransaction();

      // 트랜잭션 커밋 후 반환은 레포지토리에서 처리
      return await this.movieRepository.findOne({
        where: {
          id: movieId,
        },
        relations: ['detail', 'director', 'genres'],
      });

      // 트랜잭션 커밋(DB에 반영)
    } catch(e) {

      // 트랜잭션 롤백(처리실패 - DB에 반영되지 않음)
      await qr.rollbackTransaction();
      throw e;
    } finally {
      // 트랜잭션을 종료하고 연결을 해제 - 풀 반환
      await qr.release();
    }
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
    } catch(e) {
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
}
