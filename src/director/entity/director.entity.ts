import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseTimeEntity } from '../../common/entity/base-time.entity';
import { Movie } from '../../movie/entity/movie.entity';

@Entity()
export class Director extends BaseTimeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  dob: Date;

  @Column()
  nationality: string;

  @OneToMany(() => Movie, (movie) => movie.director)
  movies: Movie[];
}