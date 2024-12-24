import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
import { MovieDetail } from './entity/movie-detail.entity';
import { Director } from '../director/entity/director.entity';
import { Genre } from '../genre/entity/genre.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CommonService } from '../common/common.service';
import { join } from 'path';
import { rename } from 'fs/promises';
import { User } from '../user/entity/user.entity';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { envVariableKeys } from '../common/const/env.const';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MovieService {
  constructor(
    // @InjectRepository(Movie)
    // private readonly movieRepository: Repository<Movie>,
    // @InjectRepository(MovieDetail)
    // private readonly movieDetailRepository: Repository<MovieDetail>,
    // @InjectRepository(Director)
    // private readonly directorRepository: Repository<Director>,
    // @InjectRepository(Genre)
    // private readonly genreRepository: Repository<Genre>,
    // @InjectRepository(User)
    // private readonly userRepository: Repository<User>,
    // @InjectRepository(MovieUserLike)
    // private readonly movieUserLikeRepository: Repository<MovieUserLike>,
    //* typeorm에서 import
    private readonly dataSource: DataSource,
    private readonly commonService: CommonService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    //* prisma
    private readonly prisma: PrismaService,
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

    // const data = await this.movieRepository.find({
    //   order: {
    //     createdAt: 'DESC',
    //   },
    //   take: 10,
    // });
    const data = await this.prisma.movie.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // TTL을 0으로 설정하면 영구적으로 저장된다. - 서비스 단에서도 그때 그때 TTL을 설정할 수 있다.
    // 이 경우 모듈 등록의 설정을 덮어 씌운다.
    await this.cacheManager.set('MOVIE_RECENT', data);

    return data;
  }

  //* 모든 코드를 테스트할 필요는 없음. 아래 주석으로 테스트하지 않을 코드임을 jest에게 알림
  /* istanbul ignore next */
  async getMovies() {
    // return this.movieRepository
    //   .createQueryBuilder('movie')
    //   .leftJoinAndSelect('movie.director', 'director')
    //   .leftJoinAndSelect('movie.genres', 'genres');
  }

  async findAll(dto: GetMoviesDto, userId?: number) {
    const { title, cursor, take, order } = dto;

    const orderBy = order.map((field) => {
      const [column, direction] = field.split('_');
      return { [column]: direction.toLowerCase() };
    });

    //* Query Builder
    // const qb = await this.getMovies();
    //
    // if (title) {
    //   qb.where('movie.title LIKE :title', { title: `%${title}%` });
    // }
    // const count = await qb.getCount();

    const movies = await this.prisma.movie.findMany({
      where: title ? { title: { contains: title } } : {},
      take: take + 1, //? 다음 페이지를 위한 커서를 만들기 위해 - cursor의 특성때문에 이렇게 처리
      skip: cursor ? 1 : 0, //? cursor부터 데이터를 가져오기 때문에 커서부분은 스킵하기 위해서 1을 넣어준다.
      //* cursor를 통해 페이지네이션을 간단하게 구현할 수 있다! - 기존과 달리 커서에서 id값만 받아야 함
      cursor: cursor ? { id: parseInt(cursor) } : undefined,
      orderBy,
      include: {
        genres: true,
        director: true,
        detail: true,
      },
    });

    const hasNextPage = movies.length > take;

    if (hasNextPage) {
      movies.pop();
    }

    const nextCursor = hasNextPage
      ? movies[movies.length - 1].id.toString()
      : null;

    // this.commonService.applyPagePaginationParamsToQb(qb, dto);
    // this.commonService.applyCursorPaginationParamsToQb(qb, dto);
    // let { nextCursor, data } =
    //   await this.commonService.applyCursorPaginationParamsToQb(qb, dto);

    if (userId) {
      const movieIds = movies.map((movie) => movie.id);
      // const movieIds = data.map((movie) => movie.id);

      // const likedMovies =
      //   movieIds.length < 1 ? [] : await this.getLikedMovies(movieIds, userId);
      const likedMovies =
        movieIds.length < 1
          ? []
          : await this.prisma.movieUserLike.findMany({
              where: {
                movieId: { in: movieIds },
                userId,
              },
              include: {
                movie: true,
              },
            });

      const likedMovieMap = likedMovies.reduce(
        (acc, next) => ({
          ...acc,
          [next.movie.id]: next.isLike,
        }),
        {},
      );

      // data = data.map((movie) => ({
      //   ...movie,
      //   // null || true || false
      //   likeStatus: likedMovieMap[movie.id] ?? null,
      // }));

      return {
        data: movies.map((movie) => ({
          ...movie,
          likeStatus:
            movie.id in likedMovieMap ? likedMovieMap[movie.id] : null,
        })),
        nextCursor,
        hasNextPage,
      };
    }

    return {
      data: movies,
      nextCursor,
      hasNextPage,
    };
  }

  /* istanbul ignore next */
  async getLikedMovies(movieIds: number[], userId: number) {
    // return await this.movieUserLikeRepository
    //   .createQueryBuilder('mul')
    //   .leftJoinAndSelect('mul.movie', 'movie')
    //   .leftJoinAndSelect('mul.user', 'user')
    //   // ...movieIds를 하면 배열을 ,로 나눠서 넣어준다.
    //   .where('movie.id IN (:...movieIds)', { movieIds })
    //   .andWhere('user.id = :userId', { userId })
    //   .getMany();
  }

  /* istanbul ignore next */
  async findMovieDetail(id: number) {
    // return this.movieRepository
    //   .createQueryBuilder('movie')
    //   .leftJoinAndSelect('movie.director', 'director')
    //   .leftJoinAndSelect('movie.genres', 'genres')
    //   .leftJoinAndSelect('movie.detail', 'detail')
    //   .leftJoinAndSelect('movie.creator', 'creator')
    //   .where('movie.id = :id', { id })
    //   .getOne();
  }

  async findOne(id: number) {
    try {
      // const movie = await this.findMovieDetail(id);
      const movie = await this.prisma.movie.findUnique({
        where: {
          id,
        },
      });

      if (!movie) {
        throw new NotFoundException('그 영화 없어요');
      }

      return movie;
    } catch (e) {
      throw e;
    }
  }

  /* istanbul ignore next */
  async createMovieDetail(qr: QueryRunner, createMovieDto: CreateMovieDto) {
    // return qr.manager
    //   .createQueryBuilder()
    //   .insert()
    //   .into(MovieDetail)
    //   .values({
    //     detail: createMovieDto.detail,
    //   })
    //   .execute();
  }

  /* istanbul ignore next */
  async createMovie(
    qr: QueryRunner,
    createMovieDto: CreateMovieDto,
    movieDetailId: number,
    director: Director,
    userId: number,
    movieFolder: string,
  ) {
    // return qr.manager
    //   .createQueryBuilder()
    //   .insert()
    //   .into(Movie)
    //   .values({
    //     title: createMovieDto.title,
    //     // => 따로 생성한 movieDetail의 id를 넣어준다.
    //     detail: {
    //       id: movieDetailId,
    //     },
    //     director,
    //     creator: {
    //       id: userId,
    //     },
    //     movieFilePath: join(movieFolder, createMovieDto.movieFileName),
    //   })
    //   .execute();
  }

  /* istanbul ignore next */
  createMovieGenreRelation(qr: QueryRunner, movieId: number, genres: Genre[]) {
    // return qr.manager
    //   .createQueryBuilder()
    //   .relation(Movie, 'genres')
    //   .of(movieId)
    //   .add(genres.map((genre) => genre.id));
  }

  /* istanbul ignore next */
  renameMovieFile(
    tempFolder: string,
    movieFolder: string,
    createMovieDto: CreateMovieDto,
  ) {
    if (this.configService.get<string>(envVariableKeys.env) !== 'prod') {
      return rename(
        join(process.cwd(), tempFolder, createMovieDto.movieFileName), // 여기있는걸
        join(process.cwd(), movieFolder, createMovieDto.movieFileName), // 여기로 옮긴다.
      );
    } else {
      return this.commonService.saveMovieToPermanentStorage(
        createMovieDto.movieFileName,
      );
    }
  }

  //* prisma 사용한 트랜잭션 처리
  async create(createMovieDto: CreateMovieDto, userId: number) {
    return this.prisma.$transaction(async (prisma) => {
      const director = await prisma.director.findUnique({
        where: {
          id: createMovieDto.directorId,
        },
      });

      if (!director) {
        throw new NotFoundException('존재하지 않는 감독입니다!');
      }

      const genres = await prisma.genre.findMany({
        where: {
          id: {
            in: createMovieDto.genreIds,
          },
        },
      });

      if (genres.length !== createMovieDto.genreIds.length) {
        throw new NotFoundException(
          `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`,
        );
      }

      const movieDetail = await prisma.movieDetail.create({
        data: {
          detail: createMovieDto.detail,
        },
      });

      //! 영상 경로 설정부는 스킵!

      const movie = await prisma.movie.create({
        data: {
          title: createMovieDto.title,
          movieFilePath: createMovieDto.movieFileName,
          creator: { connect: { id: userId } },
          director: { connect: { id: director.id } },
          genres: {
            connect: genres.map((g) => ({ id: g.id })), //
          },
          detail: { connect: { id: movieDetail.id } },
        },
      });

      // return movie;
      return prisma.movie.findUnique({
        where: {
          id: movie.id,
        },
        include: {
          detail: true,
          director: true,
          genres: true,
        },
      });
    });
  }

  //! TypeORM QueryRunner를 사용한 트랜잭션 처리
  // async create(
  //   createMovieDto: CreateMovieDto,
  //   userId: number,
  //   qr: QueryRunner,
  // ) {
  //   //* 쿼리러너의 매니저를 통해 트랜잭션을 사용 - 실행함수에 첫번째 인자로 엔티티를 넣어준다.
  //   const director = await qr.manager.findOne(Director, {
  //     where: {
  //       id: createMovieDto.directorId,
  //     },
  //   });
  //
  //   if (!director) {
  //     throw new NotFoundException('존재하지 않는 감독입니다!');
  //   }
  //
  //   const genres = await qr.manager.find(Genre, {
  //     where: {
  //       id: In(createMovieDto.genreIds),
  //     },
  //   });
  //
  //   if (genres.length !== createMovieDto.genreIds.length) {
  //     throw new NotFoundException(
  //       `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`,
  //     );
  //   }
  //
  //   //* 메니저를 통해 쿼리빌더를 수행한경우는 엔티티를 명시하지않아도 됨
  //   //* => 어차피 쿼리빌더내에 체이닝 메서드에 엔티티를 명시해야하기 때문
  //   const movieDetail = await this.createMovieDetail(qr, createMovieDto);
  //
  //   // => 생성한 movieDetail의 id를 가져온다.
  //   const movieDetailId = movieDetail.identifiers[0].id;
  //
  //   const movieFolder = join('public', 'movie');
  //   const tempFolder = join('public', 'temp');
  //
  //   const movie = await this.createMovie(
  //     qr,
  //     createMovieDto,
  //     movieDetailId,
  //     director,
  //     userId,
  //     movieFolder,
  //   );
  //
  //   // => 생성한 movie의 id를 가져온다.
  //   const movieId = movie.identifiers[0].id;
  //
  //   // => 실질적 관계 맵핑
  //   await this.createMovieGenreRelation(qr, movieId, genres);
  //
  //   await this.renameMovieFile(tempFolder, movieFolder, createMovieDto);
  //
  //   // 컨트롤러 전체에 인터셉터로 트랜잭션을 적용했기 떄문에 쿼리러너로 모든 로직을 처리해야한다.
  //   return await qr.manager.findOne(Movie, {
  //     where: {
  //       id: movieId,
  //     },
  //     relations: ['detail', 'director', 'genres'],
  //   });
  // }

  /* istanbul ignore next */
  updateMovie(qr: QueryRunner, movieUpdateFields: UpdateMovieDto, id: number) {
    // return qr.manager
    //   .createQueryBuilder()
    //   .update(Movie)
    //   .set(movieUpdateFields)
    //   .where('id = :id', { id })
    //   .execute();
  }

  /* istanbul ignore next */
  updateMovieDetail(qr: QueryRunner, detail: string, movie: Movie) {
    // return qr.manager
    //   .createQueryBuilder()
    //   .update(MovieDetail)
    //   .set({ detail })
    //   .where('id = :id', { id: movie.detail.id })
    //   .execute();
  }

  /* istanbul ignore next */
  updateMovieGenreRelation(
    qr: QueryRunner,
    id: number,
    newGenres: Genre[],
    movie: Movie,
  ) {
    // return (
    //   qr.manager
    //     .createQueryBuilder()
    //     .relation(Movie, 'genres')
    //     .of(id)
    //     // addAndRemove(추가할 id 배열, 제거할 id 배열)
    //     .addAndRemove(
    //       // 업데이트 요청에 들어온 장르 id - 전부 등록
    //       newGenres.map((genre) => genre.id),
    //       // 기존 영화의 장르 id - 전부 삭제
    //       movie.genres.map((genre) => genre.id),
    //     )
    // );
  }

  //* prisma 사용한 트랜잭션 처리
  async update(id: number, updateMovieDto: UpdateMovieDto) {
    try {
      return this.prisma.$transaction(async (tPrisma) => {
        const movie = await tPrisma.movie.findUnique({
          where: { id },
          include: {
            detail: true,
            genres: true,
          },
        });

        if (!movie) {
          throw new NotFoundException('그 영화 없어요');
        }

        const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

        let movieUpdateParams: Prisma.MovieUpdateInput = {
          ...movieRest,
        };

        if (directorId) {
          const director = await tPrisma.director.findUnique({
            where: {
              id: directorId,
            },
          });

          if (!director) {
            throw new NotFoundException('존재하지 않는 감독입니다!');
          }

          movieUpdateParams.director = { connect: { id: directorId } };
        }

        if (genreIds) {
          const genres = await tPrisma.genre.findMany({
            where: {
              id: {
                in: genreIds,
              },
            },
          });

          if (genres.length !== genreIds.length) {
            throw new NotFoundException(
              `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`,
            );
          }

          /**
           * connect의 동작 (1:N)
           * 영화의 입장에서 connect는 영화와 특정 감독을 연결(또는 변경)하는 역할을 합니다.
           * 기존 감독과의 관계가 있는 경우, 새 감독과 연결될 때 기존 감독 관계는 자동으로 대체됩니다
           *
           * **set**을 사용하면 기존 관계를 모두 대체하여 새로운 관계를 설정합니다.
           * set은 다대다 관계에서만 사용 가능하며, 기존의 모든 연결을 제거하고 새로 설정할 때 쓰입니다.
           *
           */
          movieUpdateParams.genres = {
            set: genres.map((genre) => ({ id: genre.id })),
          };
        }

        await tPrisma.movie.update({
          where: { id },
          data: movieUpdateParams,
        });

        if (detail) {
          await tPrisma.movieDetail.update({
            where: { id: movie.detail.id },
            data: { detail },
          });
        }

        return tPrisma.movie.findUnique({
          where: { id },
          include: {
            detail: true,
            genres: true,
            director: true,
          },
        });
      });
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
  //! TypeORM QueryRunner를 사용한 트랜잭션 처리
  // async update(id: number, updateMovieDto: UpdateMovieDto) {
  //   const qr = this.dataSource.createQueryRunner();
  //   await qr.connect();
  //   await qr.startTransaction();
  //
  //   try {
  //     const movie = await qr.manager.findOne(Movie, {
  //       where: {
  //         id,
  //       },
  //       relations: ['detail', 'genres'],
  //     });
  //
  //     if (!movie) {
  //       throw new NotFoundException('그 영화 없어요');
  //     }
  //
  //     const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;
  //
  //     let newDirector;
  //
  //     if (directorId) {
  //       const director = await qr.manager.findOne(Director, {
  //         where: {
  //           id: directorId,
  //         },
  //       });
  //
  //       if (!director) {
  //         throw new NotFoundException('존재하지 않는 감독입니다!');
  //       }
  //
  //       newDirector = director;
  //     }
  //
  //     let newGenres;
  //
  //     if (genreIds) {
  //       const genres = await qr.manager.findBy(Genre, { id: In(genreIds) });
  //
  //       if (genres.length !== genreIds.length) {
  //         throw new NotFoundException(
  //           `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`,
  //         );
  //       }
  //
  //       newGenres = genres;
  //     }
  //
  //     const movieUpdateFields = {
  //       ...movieRest,
  //       ...(newDirector && { director: newDirector }),
  //     };
  //
  //     //* Query Builder로 업데이트
  //     await this.updateMovie(qr, movieUpdateFields, id);
  //
  //     if (detail) {
  //       await this.updateMovieDetail(qr, detail, movie);
  //     }
  //
  //     if (newGenres) {
  //       await this.updateMovieGenreRelation(qr, id, newGenres, movie);
  //     }
  //
  //     await qr.commitTransaction();
  //
  //     return this.movieRepository.findOne({
  //       where: {
  //         id,
  //       },
  //       relations: ['detail', 'director', 'genres'],
  //     });
  //   } catch (e) {
  //     await qr.rollbackTransaction();
  //     throw e;
  //   } finally {
  //     await qr.release();
  //   }
  // }

  async remove(id: number) {
    const movie = await this.prisma.movie.findUnique({
      where: {
        id,
      },
      include: {
        detail: true,
      },
    });
    // const movieDetail = await this.movieDetailRepository.findOne({
    //   where: {
    //     movie: {
    //       id,
    //     },
    //   },
    // });

    if (!movie) {
      throw new NotFoundException('그 영화 없어요');
    }

    // await this.movieRepository.createQueryBuilder()
    //   .delete()
    //   .where('id = :id', { id })
    //   .execute();

    // await this.movieDetailRepository.remove(movieDetail);
    await this.prisma.movie.delete({
      where: { id },
    });
    await this.prisma.movieDetail.delete({
      where: {
        id: movie.detail.id,
      },
    });

    return id;
  }

  /* istanbul ignore next */
  async getLikedRecord(movieId: number, userId: number) {
    // return await this.movieUserLikeRepository
    //   .createQueryBuilder('mul')
    //   .leftJoinAndSelect('mul.movie', 'movie')
    //   .leftJoinAndSelect('mul.user', 'user')
    //   .where('movie.id = :movieId', { movieId })
    //   .andWhere('user.id = :userId', { userId })
    //   .getOne();
    return await this.prisma.movieUserLike.findUnique({
      where: {
        // composite key 가져오는 방법
        movieId_userId: { movieId, userId },
      },
    });
  }

  async toggleMovieLike(movieId: number, userId: number, isLike: boolean) {
    // const movie = await this.movieRepository.findOne({
    //   where: {
    //     id: movieId,
    //   },
    // });
    const movie = await this.prisma.movie.findUnique({
      where: {
        id: movieId,
      },
    });

    if (!movie) {
      throw new BadRequestException('그 영화 없어요');
    }

    // const user = await this.userRepository.findOne({
    //   where: {
    //     id: userId,
    //   },
    // });
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('사용자 정보가 없어요');
    }

    const likeRecord = await this.getLikedRecord(movieId, userId);

    if (likeRecord) {
      if (isLike === likeRecord.isLike) {
        // await this.movieUserLikeRepository.delete({ movie, user });
        await this.prisma.movieUserLike.delete({
          where: {
            movieId_userId: { movieId, userId },
          },
        });
      } else {
        // await this.movieUserLikeRepository.update({ movie, user }, { isLike });
        await this.prisma.movieUserLike.update({
          where: {
            movieId_userId: { movieId, userId },
          },
          data: {
            isLike,
          },
        });
      }
    } else {
      // await this.movieUserLikeRepository.save({
      //   movie,
      //   user,
      //   isLike,
      // });
      await this.prisma.movieUserLike.create({
        data: {
          // 연관관계 데이터 생성
          movie: { connect: { id: movieId } },
          user: { connect: { id: userId } },
          isLike,
        },
      });
    }

    const result = await this.getLikedRecord(movieId, userId);

    // console.log('result', result);

    return {
      isLike: result && result.isLike,
    };
  }
}
