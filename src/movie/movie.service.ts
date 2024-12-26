import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
// import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, QueryRunner, Repository } from 'typeorm';
// import { MovieDetail } from './entity/movie-detail.entity';
// import { Director } from '../director/entity/director.entity';
// import { Genre } from '../genre/entity/genre.entity';
import { GetMoviesDto } from './dto/get-movies.dto';
import { CommonService } from '../common/common.service';
import { join } from 'path';
import { rename } from 'fs/promises';
// import { User } from '../user/entity/user.entity';
// import { MovieUserLike } from './entity/movie-user-like.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { envVariableKeys } from '../common/const/env.const';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@prisma/client';
import { InjectModel } from '@nestjs/mongoose';
import { Movie } from './schema/movie.schema';
import { Model, Types, Document } from 'mongoose';
import { MovieDetail } from './schema/movie-detail.schema';
import { Director } from '../director/schema/director.schema';
import { Genre } from '../genre/schema/genre.schema';
import { User } from '../user/schema/user.schema';
import { MovieUserLike } from './schema/movie-user-like.schema';

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
    // private readonly prisma: PrismaService,

    //* mongoose
    @InjectModel(Movie.name)
    private readonly movieModel: Model<Movie>,
    @InjectModel(MovieDetail.name)
    private readonly movieDetailModel: Model<MovieDetail>,
    @InjectModel(Director.name)
    private readonly directorModel: Model<Director>,
    @InjectModel(Genre.name)
    private readonly genreModel: Model<Genre>,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(MovieUserLike.name)
    private readonly movieUserLikeModel: Model<MovieUserLike>,
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

    //* Mongoose
    const data = await this.movieModel
      .find()
      .populate({
        path: 'genres',
        model: 'Genre',
      })
      .sort({ createdAt: -1 }) // -> ORDER BY createdAt 'desc',
      .limit(10)
      .exec();

    //* Prisma
    // const data = await this.prisma.movie.findMany({
    //   orderBy: {
    //     createdAt: 'desc',
    //   },
    //   take: 10,
    // });

    //* TypeORM
    // const data = await this.movieRepository.find({
    //   order: {
    //     createdAt: 'DESC',
    //   },
    //   take: 10,
    // });

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

    //* Mongoose order 처리 -> 객체로 받아서 처리
    const orderBy = order.reduce((acc, field) => {
      const [column, direction] = field.split('_');
      if (column === 'id') {
        acc['_id'] = direction.toLowerCase();
      } else {
        acc[column] = direction.toLowerCase();
      }

      return acc;
    }, {});

    //* Prisma order 처리 -> 배열을 받아서 처리
    // const orderBy = order.map((field) => {
    //   const [column, direction] = field.split('_');
    //   return { [column]: direction.toLowerCase() };
    // });

    //* Query Builder
    // const qb = await this.getMovies();
    //
    // if (title) {
    //   qb.where('movie.title LIKE :title', { title: `%${title}%` });
    // }
    // const count = await qb.getCount();

    //* Mongoose
    const query = this.movieModel
      .find(
        title
          ? {
              // title 문자로 데이터 찾기
              title: { $regex: title },
              // 대소문자 구분 없이 찾기
              $option: 'i',
            }
          : {},
      )
      .sort(orderBy)
      .limit(take + 1);
    if (cursor) {
      query.lt('_id', new Types.ObjectId(cursor));
    }

    //? populate(join과 유사한 기능) - 아래 두가지 방법 모두 가능
    // const movies = await query.populate('genres').populate('director').exec();
    const movies = await query.populate('genres director').exec();

    //* Prisma
    // const movies = await this.prisma.movie.findMany({
    //   where: title ? { title: { contains: title } } : {},
    //   take: take + 1, //? 다음 페이지를 위한 커서를 만들기 위해 - cursor의 특성때문에 이렇게 처리
    //   skip: cursor ? 1 : 0, //? cursor부터 데이터를 가져오기 때문에 커서부분은 스킵하기 위해서 1을 넣어준다.
    //   //* cursor를 통해 페이지네이션을 간단하게 구현할 수 있다! - 기존과 달리 커서에서 id값만 받아야 함
    //   cursor: cursor ? { id: parseInt(cursor) } : undefined,
    //   orderBy,
    //   include: {
    //     genres: true,
    //     director: true,
    //     detail: true,
    //   },
    // });

    const hasNextPage = movies.length > take;

    if (hasNextPage) {
      movies.pop();
    }

    const nextCursor = hasNextPage
      ? // ? movies[movies.length - 1].id.toString()
        //? mongoDB에서 id => _id
        movies[movies.length - 1]._id.toString()
      : null;

    // this.commonService.applyPagePaginationParamsToQb(qb, dto);
    // this.commonService.applyCursorPaginationParamsToQb(qb, dto);
    // let { nextCursor, data } =
    //   await this.commonService.applyCursorPaginationParamsToQb(qb, dto);

    if (userId) {
      //? mongoDB에서 id => _id
      const movieIds = movies.map((movie) => movie._id);
      // const movieIds = movies.map((movie) => movie.id);
      // const movieIds = data.map((movie) => movie.id);

      // const likedMovies =
      //   movieIds.length < 1 ? [] : await this.getLikedMovies(movieIds, userId);
      const likedMovies =
        movieIds.length < 1
          ? []
          : //* Mongoose
            await this.movieUserLikeModel
              .find({
                movie: {
                  $in: movieIds.map((id) => new Types.ObjectId(id.toString())),
                },
                user: new Types.ObjectId(userId.toString()),
              })
              .populate('movie')
              .exec();
      //* Prisma
      // : await this.prisma.movieUserLike.findMany({
      //     where: {
      //       movieId: { in: movieIds },
      //       userId,
      //     },
      //     include: {
      //       movie: true,
      //     },
      //   });

      const likedMovieMap = likedMovies.reduce(
        (acc, next) => ({
          ...acc,
          // [next.movie.id]: next.isLike,
          //? mongoDB에서 id => _id
          [next.movie._id.toString()]: next.isLike,
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
          // 데이터가 상당히 복잡해서 가공전에 plain object로 변환
          ...movie.toObject(),
          likeStatus:
            // movie.id in likedMovieMap ? likedMovieMap[movie.id] : null,
            //? mongoDB에서 id => _id
            movie._id.toString() in likedMovieMap
              ? likedMovieMap[`${movie._id}`]
              : null,
        })) as (Document<unknown, object, Movie> &
          Movie &
          Required<{ _id: unknown }> & { __v: number } & {
            likeStatus: boolean;
          })[],
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

  // async findOne(id: number) {
  //? mongoose _id -> string
  async findOne(id: string) {
    try {
      //* Mongoose
      const movie = await this.movieModel.findById(id).exec();

      //* Prisma
      // const movie = await this.prisma.movie.findUnique({
      //   where: {
      //     id,
      //   },
      // });

      //* TypeORM
      // const movie = await this.findMovieDetail(id);

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

  //* mongoose 사용한 트랜잭션 처리
  async create(createMovieDto: CreateMovieDto, userId: number) {
    const session = await this.movieModel.startSession();
    session.startTransaction();

    try {
      const director = await this.directorModel
        .findById(createMovieDto.directorId)
        .exec();

      if (!director) {
        throw new NotFoundException('존재하지 않는 감독입니다!');
      }

      const genres = await this.genreModel
        .find({
          _id: { $in: createMovieDto.genreIds },
        })
        .exec();

      if (genres.length !== createMovieDto.genreIds.length) {
        throw new NotFoundException(
          `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`,
        );
      }

      const movieDetail = await this.movieDetailModel.create(
        [
          {
            detail: createMovieDto.detail,
          },
        ],
        //? 세션을 통해 트랜잭션 처리
        { session },
      );

      const movie = await this.movieModel.create(
        [
          {
            title: createMovieDto.title,
            movieFilePath: createMovieDto.movieFileName,
            creator: userId,
            director: director._id,
            genres: genres.map((g) => g._id),
            detail: movieDetail[0]._id,
          },
        ],
        {
          session,
        },
      );

      await session.commitTransaction();

      return (
        this.movieModel
          .findById(movie[0]._id)
          .populate('detail')
          .populate('director')
          // 생성후 장르를 제대로 못가져오는 이슈 해결
          // 아마 스키마이름과 무비스키마에서 장르 필드 이름간에 문제가 있는듯 보임
          // 경로와 모델을 직접 지정해주어서 해결
          .populate({
            path: 'genres',
            model: 'Genre',
          })
          .exec()
      );
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      await session.endSession();
    }
  }

  //* prisma 사용한 트랜잭션 처리
  // async create(createMovieDto: CreateMovieDto, userId: number) {
  //   return this.prisma.$transaction(async (prisma) => {
  //     const director = await prisma.director.findUnique({
  //       where: {
  //         id: createMovieDto.directorId,
  //       },
  //     });
  //
  //     if (!director) {
  //       throw new NotFoundException('존재하지 않는 감독입니다!');
  //     }
  //
  //     const genres = await prisma.genre.findMany({
  //       where: {
  //         id: {
  //           in: createMovieDto.genreIds,
  //         },
  //       },
  //     });
  //
  //     if (genres.length !== createMovieDto.genreIds.length) {
  //       throw new NotFoundException(
  //         `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`,
  //       );
  //     }
  //
  //     const movieDetail = await prisma.movieDetail.create({
  //       data: {
  //         detail: createMovieDto.detail,
  //       },
  //     });
  //
  //     //! 영상 경로 설정부는 스킵!
  //
  //     const movie = await prisma.movie.create({
  //       data: {
  //         title: createMovieDto.title,
  //         movieFilePath: createMovieDto.movieFileName,
  //         creator: { connect: { id: userId } },
  //         director: { connect: { id: director.id } },
  //         genres: {
  //           connect: genres.map((g) => ({ id: g.id })), //
  //         },
  //         detail: { connect: { id: movieDetail.id } },
  //       },
  //     });
  //
  //     // return movie;
  //     return prisma.movie.findUnique({
  //       where: {
  //         id: movie.id,
  //       },
  //       include: {
  //         detail: true,
  //         director: true,
  //         genres: true,
  //       },
  //     });
  //   });
  // }

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

  //* mongoose 사용한 트랜잭션 처리
  // async update(id: number, updateMovieDto: UpdateMovieDto) {
  //? mongoose _id -> string
  async update(id: string, updateMovieDto: UpdateMovieDto) {
    const session = await this.movieModel.startSession();
    session.startTransaction();

    try {
      const movie = await this.movieModel
        .findById(id)
        .populate('detail genres')
        .exec();

      if (!movie) {
        throw new NotFoundException('그 영화 없어요');
      }

      const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;

      let movieUpdateParams: {
        title?: string;
        movieFileName?: string;
        director?: Types.ObjectId;
        genres?: Types.ObjectId[];
      } = {
        ...movieRest,
      };

      if (directorId) {
        const director = await this.directorModel.findById(directorId).exec();

        if (!director) {
          throw new NotFoundException('존재하지 않는 감독입니다!');
        }

        movieUpdateParams.director = director._id as Types.ObjectId;
      }

      if (genreIds) {
        const genres = await this.genreModel
          .find({
            _id: { $in: genreIds },
          })
          .exec();

        if (genres.length !== genreIds.length) {
          throw new NotFoundException(
            `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre._id).join(', ')}`,
          );
        }

        movieUpdateParams.genres = genres.map(
          (genre) => genre._id,
        ) as Types.ObjectId[];
      }

      if (detail) {
        await this.movieDetailModel
          .findByIdAndUpdate(movie.detail._id, { detail }, { session })
          .exec();
      }

      await this.movieModel.findByIdAndUpdate(id, movieUpdateParams, {
        session,
      });

      await session.commitTransaction();

      return this.movieModel
        .findById(id)
        .populate('detail director')
        .populate({
          path: 'genres',
          model: 'Genre',
        })
        .exec();
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      await session.endSession();
    }
  }

  //* prisma 사용한 트랜잭션 처리
  // async update(id: number, updateMovieDto: UpdateMovieDto) {
  //   try {
  //     return this.prisma.$transaction(async (tPrisma) => {
  //       const movie = await tPrisma.movie.findUnique({
  //         where: { id },
  //         include: {
  //           detail: true,
  //           genres: true,
  //         },
  //       });
  //
  //       if (!movie) {
  //         throw new NotFoundException('그 영화 없어요');
  //       }
  //
  //       const { detail, directorId, genreIds, ...movieRest } = updateMovieDto;
  //
  //       let movieUpdateParams: Prisma.MovieUpdateInput = {
  //         ...movieRest,
  //       };
  //
  //       if (directorId) {
  //         const director = await tPrisma.director.findUnique({
  //           where: {
  //             id: directorId,
  //           },
  //         });
  //
  //         if (!director) {
  //           throw new NotFoundException('존재하지 않는 감독입니다!');
  //         }
  //
  //         movieUpdateParams.director = { connect: { id: directorId } };
  //       }
  //
  //       if (genreIds) {
  //         const genres = await tPrisma.genre.findMany({
  //           where: {
  //             id: {
  //               in: genreIds,
  //             },
  //           },
  //         });
  //
  //         if (genres.length !== genreIds.length) {
  //           throw new NotFoundException(
  //             `존재하지 않는 장르가 있습니다! 존재하는 ids: ${genres.map((genre) => genre.id).join(', ')}`,
  //           );
  //         }
  //
  //         /**
  //          * connect의 동작 (1:N)
  //          * 영화의 입장에서 connect는 영화와 특정 감독을 연결(또는 변경)하는 역할을 합니다.
  //          * 기존 감독과의 관계가 있는 경우, 새 감독과 연결될 때 기존 감독 관계는 자동으로 대체됩니다
  //          *
  //          * **set**을 사용하면 기존 관계를 모두 대체하여 새로운 관계를 설정합니다.
  //          * set은 다대다 관계에서만 사용 가능하며, 기존의 모든 연결을 제거하고 새로 설정할 때 쓰입니다.
  //          *
  //          */
  //         movieUpdateParams.genres = {
  //           set: genres.map((genre) => ({ id: genre.id })),
  //         };
  //       }
  //
  //       await tPrisma.movie.update({
  //         where: { id },
  //         data: movieUpdateParams,
  //       });
  //
  //       if (detail) {
  //         await tPrisma.movieDetail.update({
  //           where: { id: movie.detail.id },
  //           data: { detail },
  //         });
  //       }
  //
  //       return tPrisma.movie.findUnique({
  //         where: { id },
  //         include: {
  //           detail: true,
  //           genres: true,
  //           director: true,
  //         },
  //       });
  //     });
  //   } catch (e) {
  //     console.log(e);
  //     throw e;
  //   }
  // }
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

  // async remove(id: number) {
  //? mongoose _id -> string
  async remove(id: string) {
    //* Mongoose
    const movie = await this.movieModel.findById(id).populate('detail').exec();

    //* Prisma
    // const movie = await this.prisma.movie.findUnique({
    //   where: {
    //     id,
    //   },
    //   include: {
    //     detail: true,
    //   },
    // });

    //* TypeORM
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

    //* Mongoose
    await this.movieModel.findByIdAndDelete(id).exec();
    await this.movieDetailModel.findByIdAndDelete(movie.detail._id).exec();

    //* Prisma
    // await this.prisma.movie.delete({
    //   where: { id },
    // });
    // await this.prisma.movieDetail.delete({
    //   where: {
    //     id: movie.detail.id,
    //   },
    // });

    //* TypeORM
    // await this.movieRepository.createQueryBuilder()
    //   .delete()
    //   .where('id = :id', { id })
    //   .execute();

    // await this.movieDetailRepository.remove(movieDetail);

    return id;
  }

  /* istanbul ignore next */
  // async getLikedRecord(movieId: number, userId: number) {
  //? mongoose _id -> string
  async getLikedRecord(movieId: string, userId: string) {
    //* Mongoose
    return this.movieUserLikeModel.findOne({
      movie: new Types.ObjectId(movieId),
      user: new Types.ObjectId(userId),
    });

    //* Prisma
    // return await this.prisma.movieUserLike.findUnique({
    //   where: {
    //     // composite key 가져오는 방법
    //     movieId_userId: { movieId, userId },
    //   },
    // });

    //* TypeORM - QueryBuilder
    // return await this.movieUserLikeRepository
    //   .createQueryBuilder('mul')
    //   .leftJoinAndSelect('mul.movie', 'movie')
    //   .leftJoinAndSelect('mul.user', 'user')
    //   .where('movie.id = :movieId', { movieId })
    //   .andWhere('user.id = :userId', { userId })
    //   .getOne();
  }

  // async toggleMovieLike(movieId: number, userId: number, isLike: boolean) {
  //? mongoose _id -> string
  async toggleMovieLike(movieId: string, userId: string, isLike: boolean) {
    //* Mongoose
    const movie = await this.movieModel.findById(movieId).exec();

    //* Prisma
    // const movie = await this.prisma.movie.findUnique({
    //   where: {
    //     id: movieId,
    //   },
    // });

    //* TypeORM
    // const movie = await this.movieRepository.findOne({
    //   where: {
    //     id: movieId,
    //   },
    // });

    if (!movie) {
      throw new BadRequestException('그 영화 없어요');
    }

    //* Mongoose
    const user = await this.userModel.findById(userId).exec();

    //* Prisma
    // const user = await this.prisma.user.findUnique({
    //   where: {
    //     id: userId,
    //   },
    // });

    //* TypeORM
    // const user = await this.userRepository.findOne({
    //   where: {
    //     id: userId,
    //   },
    // });

    if (!user) {
      throw new UnauthorizedException('사용자 정보가 없어요');
    }

    const likeRecord = await this.getLikedRecord(movieId, userId);

    if (likeRecord) {
      if (isLike === likeRecord.isLike) {
        //* Mongoose
        await this.movieUserLikeModel.findByIdAndDelete(likeRecord._id).exec();

        //* Prisma
        // await this.prisma.movieUserLike.delete({
        //   where: {
        //     movieId_userId: { movieId, userId },
        //   },
        // });

        //* TypeORM
        // await this.movieUserLikeRepository.delete({ movie, user });
      } else {
        //* Mongoose
        // await this.movieUserLikeModel.findByIdAndUpdate(likeRecord._id, { isLike }).exec();
        likeRecord.isLike = isLike;
        await likeRecord.save();

        //* Prisma
        // await this.prisma.movieUserLike.update({
        //   where: {
        //     movieId_userId: { movieId, userId },
        //   },
        //   data: {
        //     isLike,
        //   },
        // });

        //* TypeORM
        // await this.movieUserLikeRepository.update({ movie, user }, { isLike });
      }
    } else {
      //* Mongoose
      await this.movieUserLikeModel.create({
        movie: new Types.ObjectId(movieId),
        user: new Types.ObjectId(userId),
        isLike,
      });

      //* Prisma
      // await this.prisma.movieUserLike.create({
      //   data: {
      //     // 연관관계 데이터 생성
      //     movie: { connect: { id: movieId } },
      //     user: { connect: { id: userId } },
      //     isLike,
      //   },
      // });

      //* TypeORM
      // await this.movieUserLikeRepository.save({
      //   movie,
      //   user,
      //   isLike,
      // });
    }

    const result = await this.getLikedRecord(movieId, userId);

    // console.log('result', result);

    return {
      isLike: result && result.isLike,
    };
  }
}
