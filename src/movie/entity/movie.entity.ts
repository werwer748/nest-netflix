import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseTimeEntity } from '../../common/entity/base-time.entity';
import { MovieDetail } from './movie-detail.entity';
import { Director } from '../../director/entity/director.entity';
import { Genre } from '../../genre/entities/genre.entity';
import { Transform } from 'class-transformer';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Movie extends BaseTimeEntity {
  // pk 등록
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  title: string;

  @Column({
    default: 0,
  })
  likeCount: number;

  @Column()
  @Transform(({ value }) => `http://localhost:3000/${value}`)
  movieFilePath: string;

  @OneToOne(() => MovieDetail, (movieDetail) => movieDetail.movie, {
    cascade: true,
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn()
  detail: MovieDetail;

  @ManyToOne(() => Director, (director) => director.movies, {
    cascade: true,
    nullable: false,
  })
  director: Director;

  @ManyToMany(() => Genre, (genre) => genre.movies)
  @JoinTable()
  genres: Genre[];

  @ManyToOne(() => User, (user) => user.createdMovies)
  creator: User;
}
