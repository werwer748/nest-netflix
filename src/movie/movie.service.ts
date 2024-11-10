import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, In, Like, Repository } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from '../director/entity/director.entity';
import { Genre } from '../genre/entities/genre.entity';

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
  ) {}

  findAll(title?: string) {
    //* Query Builder
    const qb = this.movieRepository.createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres');

    if (title) {
      qb.where('movie.title LIKE :title', { title: `%${title}%` });
    }

    return qb.getManyAndCount();
  }

  async findOne(id: number) {
    const movie = this.movieRepository.createQueryBuilder('movie')
      .leftJoinAndSelect('movie.director', 'director')
      .leftJoinAndSelect('movie.genres', 'genres')
      .leftJoinAndSelect('movie.detail', 'detail')
      .where('movie.id = :id', { id })
      .getOne();

    return movie;
  }

  async create(createMovieDto: CreateMovieDto) {
    const director = await this.directorRepository.findOne({
      where: {
        id: createMovieDto.directorId,
      }
    });

    if (!director) {
      throw new NotFoundException('존재하지 않는 감독입니다!');
    }

    const genres = await this.genreRepository.findBy({ id: In(createMovieDto.genreIds) });

    if (genres.length !== createMovieDto.genreIds.length) {
      throw new NotFoundException(`존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`);
    }

    //? 쿼리빌더의 한계...
    //* Repository에서 처럼 cacade 옵션을 통해 자동으로 함께 생성되게끔 할 수가 없다!
    // => 따로 영화 상세를 생성
    const movieDetail = await this.movieDetailRepository.createQueryBuilder()
      .insert()
      .into(MovieDetail)
      .values({
        detail: createMovieDto.detail,
      })
      .execute();

    // => 생성한 movieDetail의 id를 가져온다.
    const movieDetailId = movieDetail.identifiers[0].id;

    const movie = await this.movieRepository.createQueryBuilder()
      .insert()
      .into(Movie)
      .values({
        title: createMovieDto.title,
        // => 따로 생성한 movieDetail의 id를 넣어준다.
        detail: {
          id: movieDetailId
        },
        director,
      })
      .execute();

    // => 생성한 movie의 id를 가져온다.
    const movieId = movie.identifiers[0].id;

    // => 실질적 관계 맵핑
    await this.movieRepository.createQueryBuilder()
      .relation(Movie, 'genres')
      .of(movieId)
      .add(genres.map((genre) => genre.id));

    return await this.movieRepository.findOne({
      where: {
        id: movieId,
      },
      relations: ['detail', 'director', 'genres'],
    })
  }

  async update(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = await this.movieRepository.findOne({
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
      const director = await this.directorRepository.findOne({
        where: {
          id: directorId,
        }
      });

      if (!director) {
        throw new NotFoundException('존재하지 않는 감독입니다!');
      }

      newDirector = director;
    }

    let newGenres;

    if (genreIds) {
      const genres = await this.genreRepository.findBy({ id: In(genreIds) });

      if (genres.length !== genreIds.length) {
        throw new NotFoundException(`존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`);
      }

      newGenres = genres;
    }

    const movieUpdateFields = {
      ...movieRest,
      ...(newDirector && { director: newDirector }),
    };

    //* Query Builder로 업데이트
    await this.movieRepository.createQueryBuilder()
      .update(Movie)
      .set(movieUpdateFields)
      .where('id = :id', { id })
      .execute();

    if (detail) {
      await this.movieDetailRepository.createQueryBuilder()
        .update(MovieDetail)
        .set({ detail })
        .where('id = :id', { id: movie.detail.id })
        .execute();
    }

    if (newGenres) {
      await this.movieRepository.createQueryBuilder()
        .relation(Movie, 'genres')
        .of(id)
        // addAndRemove(추가할 id 배열, 제거할 id 배열)
        .addAndRemove(
          // 업데이트 요청에 들어온 장르 id - 전부 등록
          newGenres.map((genre) => genre.id),
          // 기존 영화의 장르 id - 전부 삭제
          movie.genres.map((genre) => genre.id)
        );
    }

    return this.movieRepository.findOne({
      where: {
        id,
      },
      relations: ['detail', 'director', 'genres'],
    });
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
