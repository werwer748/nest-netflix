import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { Movie } from './entity/movie.entity';
import { MovieDetail } from './entity/movie-detail.entity';
import { Role, User } from '../user/entity/user.entity';
import { Director } from '../director/entity/director.entity';
import { Genre } from '../genre/entities/genre.entity';
import { DataSource } from 'typeorm';
import { MovieUserLike } from './entity/movie-user-like.entity';
import { AuthService } from '../auth/auth.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { MovieService } from './movie.service';

describe('MovieController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let users: User[];
  let directors: Director[];
  let movies: Movie[];
  let genres: Genre[];

  let movieService: MovieService;

  let token: string;

  //* beforeAll은 테스트가 시작하기 전에 한번 실행되는 함수
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    //* AppModule 밖에서 설정된 글로벌 파이프를 테스트에 적용하기
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    )

    await app.init();

    dataSource = app.get<DataSource>(DataSource);

    const movieUserLikeRepository = dataSource.getRepository(MovieUserLike);
    const movieRepository = dataSource.getRepository(Movie);
    const movieDetailRepository = dataSource.getRepository(MovieDetail);
    const userRepository = dataSource.getRepository(User);
    const directorRepository = dataSource.getRepository(Director);
    const genreRepository = dataSource.getRepository(Genre);


    movieService = moduleFixture.get<MovieService>(MovieService);

    // await movieUserLikeRepository.delete({});
    // await movieRepository.delete({});
    // await movieDetailRepository.delete({});
    // await userRepository.delete({});
    // await directorRepository.delete({});
    // await genreRepository.delete({});

    users = [1, 2].map((x) => {
      return userRepository.create({
        id: x,
        email: `${x}@test.com`,
        password: `123123`
      });
    });
    await userRepository.save(users);

    directors = [1, 2].map((x) => {
      return directorRepository.create({
        id: x,
        dob: new Date('1993-05-07'),
        nationality: 'South Korea',
        name: `Director Name${x}`
      });
    });
    await directorRepository.save(directors);

    genres = [1, 2].map((x) => {
      return genreRepository.create({
        id: x,
        name: `Genre ${x}`
      });
    });
    await genreRepository.save(genres);

    movies = Array.from({length: 15}, (v, i) => {
      const movieNum = i + 1;
      return movieRepository.create({
        id: movieNum,
        title: `Movie ${movieNum}`,
        creator: users[0],
        genres: genres,
        likeCount: 0,
        disLikeCount: 0,
        detail: movieDetailRepository.create({
          detail: `Movie Detail ${movieNum}`
        }),
        movieFilePath: 'movies/movie1.mp4',
        director: directors[0],
        createdAt: new Date(`2024-10-${movieNum}`)
      });
    });
    await movieRepository.save(movies);

    // AuthService를 가져와서 토큰을 발급받는다.
    let authService = moduleFixture.get<AuthService>(AuthService);
    // 값을 직접 세팅해서 토큰 발급
    token = await authService.issueToken({ id: users[0].id, role: Role.admin }, false);
  });

  //* afterAll은 테스트가 끝난 후 한번 실행되는 함수
  afterAll(async () => {
    // 너무 빨리 종료로직이 실행되면 에러가 반환되기 때문에 약간 기다리는 시간을 준다.
    await new Promise((resolve) => setTimeout(resolve, 500));
    // 연결한 데이터 소스를 삭제
    await dataSource.destroy();
    // 서버를 닫아준다.
    await app.close();
  });

  describe('[GET] /movie', () => {
    it('should get all movies', async () => {
      const { body, statusCode, error } = await request(app.getHttpServer())
        .get('/movie');

      expect(statusCode).toBe(200);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('nextCursor');
      expect(body).toHaveProperty('count');

      expect(body.data).toHaveLength(5);
    });
  });

  describe('[GET] /movie/recent', () => {
    it('should get recent movies', async () => {
      const { body, statusCode } = await request(app.getHttpServer())
        .get('/movie/recent')
        .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(200);
      expect(body).toHaveLength(10);
    });
  });

  describe('[GET] /move/{id}', () => {
    it('should get movie by id', async () => {
      const movieId = movies[0].id;

      const { body, statusCode } = await request(app.getHttpServer())
        .get(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(200);
      expect(body.id).toBe(movieId);
    });

    it('should throw 404 error if movie does not exist', async () => {
      const movieId = 999999;

      const { body, statusCode } = await request(app.getHttpServer())
        .get(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(404);
    });
  });

  describe('[POST] /movie', () => {
    //* 실제 파일저장하지않고 모킹해보기
    beforeEach(() => {
      jest.spyOn(movieService, 'renameMovieFile').mockResolvedValue();
    });

    it('should should create movie', async () => {
      //* 실제로는 이렇게하는 것 보다 모킹을 하는게 더 낫다.
      // const { body: { fileName } } = await request(app.getHttpServer())
      //   .post(`/common/video`)
      //   .set('authorization', `Bearer ${token}`)
      //   // 실제 영상 파일이 아닌 Buffer로 가짜 파일 데이터를 만들어서 보낸다.
      //   //? attach('키값', Buffer.from('파일데이터'), '파일명')
      //   .attach('video', Buffer.from('test'), 'movie.mp4')
      //   .expect(201);


      const dto: CreateMovieDto = {
        title: 'New Movie',
        detail: 'New Movie Detail',
        directorId: directors[0].id,
        genreIds: genres.map((v) => v.id),
        movieFileName: 'movie.mp4',
      };

      const { body, statusCode } = await request(app.getHttpServer())
        .post(`/movie`)
        .set('authorization', `Bearer ${token}`)
        .send(dto);

      expect(statusCode).toBe(201);

      //* 리턴된 값이 존재하는지 체크! - 없어도 되는 코드긴 함.
      expect(body).toBeDefined();

      expect(body.title).toBe(dto.title);
      expect(body.detail.detail).toBe(dto.detail);
      expect(body.director.id).toBe(dto.directorId);
      expect(body.genres.map(v => v.id)).toEqual(dto.genreIds);
      // 경로를 가지기 때문에 포함 여부만 체크
      expect(body.movieFilePath).toContain(dto.movieFileName);
    });
  });

  describe('[PATCH] /movie/{id}', () => {
    it('should update movie if exists', async () => {
      const dto = {
        title: 'Updated Title',
        detail: 'Updated Detail',
        directorId: directors[1].id,
        genreIds: [genres[0].id]
      };
      const movieId = movies[0].id;

      const { body, statusCode } = await request(app.getHttpServer())
        .patch(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`)
        .send(dto);

      expect(statusCode).toBe(200);

      expect(body).toBeDefined();
      expect(body.title).toBe(dto.title);
      expect(body.title).toBe(dto.title);
      expect(body.detail.detail).toBe(dto.detail);
      expect(body.director.id).toBe(dto.directorId);
      expect(body.genres.map(v => v.id)).toEqual(dto.genreIds);
    });
  });

  describe('[DELETE] /movie/{id}', () => {
    it('should delete existing movie', async () => {
      const movieId = movies[0].id;

      const { body, statusCode } = await request(app.getHttpServer())
        .delete(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(200);
    });

    it('should throw 404 error if movie does not exist', async () => {
      const movieId = 100;

      const { statusCode } = await request(app.getHttpServer())
        .delete(`/movie/${movieId}`)
        .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(404);
    });
  });

  describe('[POST] /movie/{id}/like', () => {
    it('should like a movie', async () => {
      // beforeAll에서 생성한 movies를 모든 테스트에서 사용중이고 0번 영화는 DB에서는
      // 삭제되었으므로 1번 영화를 사용
      const movieId = movies[1].id;

      const { statusCode, body } = await request(app.getHttpServer())
        .post(`/movie/${movieId}/like`)
        .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(201);

      expect(body).toBeDefined();
      expect(body.isLike).toBe(true);
    });

    it('should cancel like a movie', async () => {
      const movieId = movies[1].id;

      const { statusCode, body } = await request(app.getHttpServer())
        .post(`/movie/${movieId}/like`)
        .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(201);

      expect(body).toBeDefined();
      expect(body.isLike).toBeNull();
    });
  });

  describe('[POST] /movie/{id}/dislike', () => {
    it('should dislike a movie', async () => {
      // beforeAll에서 생성한 movies를 모든 테스트에서 사용중이고 0번 영화는 DB에서는
      // 삭제되었으므로 1번 영화를 사용
      const movieId = movies[1].id;

      const { statusCode, body } = await request(app.getHttpServer())
        .post(`/movie/${movieId}/dislike`)
        .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(201);

      expect(body).toBeDefined();
      expect(body.isLike).toBe(false);
    });

    it('should cancel dislike a movie', async () => {
      const movieId = movies[1].id;

      const { statusCode, body } = await request(app.getHttpServer())
        .post(`/movie/${movieId}/dislike`)
        .set('authorization', `Bearer ${token}`);

      expect(statusCode).toBe(201);

      expect(body).toBeDefined();
      expect(body.isLike).toBeNull();
    });
  });
});
