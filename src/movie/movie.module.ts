import { Module } from '@nestjs/common';
import { MovieService } from './movie.service';
import { MovieController } from './movie.controller';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Movie } from './entity/movie.entity';
// import { MovieDetail } from './entity/movie-detail.entity';
// import { Director } from '../director/entity/director.entity';
// import { Genre } from '../genre/entity/genre.entity';
// import { User } from '../user/entity/user.entity';
// import { MovieUserLike } from './entity/movie-user-like.entity';
import { CommonModule } from '../common/common.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Movie, MovieSchema } from './schema/movie.schema';
import { MovieDetail, MovieDetailSchema } from './schema/movie-detail.schema';
import { Director, DirectorSchema } from '../director/schema/director.schema';
import { Genre, GenreSchema } from '../genre/schema/genre.schema';
import { User, UserSchema } from '../user/schema/user.schema';
import {
  MovieUserLike,
  MovieUserLikeSchema,
} from './schema/movie-user-like.schema';

@Module({
  imports: [
    // TypeOrmModule.forFeature([
    //   Movie,
    //   MovieDetail,
    //   Director,
    //   Genre,
    //   User,
    //   MovieUserLike,
    // ]),
    MongooseModule.forFeature([
      {
        name: Movie.name,
        schema: MovieSchema,
      },
      {
        name: MovieDetail.name,
        schema: MovieDetailSchema,
      },
      {
        name: Director.name,
        schema: DirectorSchema,
      },
      {
        name: Genre.name,
        schema: GenreSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: MovieUserLike.name,
        schema: MovieUserLikeSchema,
      },
    ]),
    CommonModule,
  ],
  controllers: [MovieController],
  providers: [MovieService],
})
export class MovieModule {}
