import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './entity/movie.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Like, Repository } from 'typeorm';

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private readonly movieRepository: Repository<Movie>,
  ) {}

  getManyMovies(title?: string) {
    const titleWhere: FindManyOptions<Movie> = title
      ? {
          where: {
            title: Like(`%${title}%`),
          },
        }
      : {};

    // [await this.movieRepository.find(), await this.movieRepository.count()]
    return this.movieRepository.findAndCount(titleWhere);
  }

  async getMovieById(id: number) {
    const movie = await this.movieRepository.findOne({
      where: {
        id,
      },
    });

    if (!movie) {
      throw new NotFoundException('그 영화 없어요');
    }

    return movie;
  }

  async createMovie(createMovieDto: CreateMovieDto) {
    const movie = await this.movieRepository.save({
      ...createMovieDto,
      runtime: 100,
    });

    return movie;
  }

  async updateMovie(id: number, updateMovieDto: UpdateMovieDto) {
    const movie = await this.movieRepository.findOne({
      where: {
        id,
      },
    });

    if (!movie) {
      throw new NotFoundException('그 영화 없어요');
    }

    // update문은 저장한 값을 반환해주지 않는다.
    await this.movieRepository.update({ id }, updateMovieDto);

    const newMovie = await this.movieRepository.findOne({
      where: {
        id,
      },
    });

    return newMovie;
  }

  async deleteMovie(id: number) {
    const movie = await this.movieRepository.findOne({
      where: {
        id,
      },
    });

    if (!movie) {
      throw new NotFoundException('그 영화 없어요');
    }

    await this.movieRepository.delete(id);

    return id;
  }
}
