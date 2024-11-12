import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseTimeEntity } from '../../common/entity/base-time.entity';
import { Movie } from '../../movie/entity/movie.entity';

@Entity()
export class Genre extends BaseTimeEntity{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  name: string;

  @ManyToMany(() => Movie, (movie) => movie.genres)
  movies: Movie[];
}
