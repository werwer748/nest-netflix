import { Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Movie } from './movie.entity';
import { User } from '../../user/entities/user.entity';

//* 좋아요 다대다 중간테이블 직접 생성한 관계 맺기
@Entity()
export class MovieUserLike {
  //* 굳이 유니크한 식별자를 두고 쓸 이유가 없다.(중간테이블일뿐..)
  // @PrimaryGeneratedColumn()
  // id: number;

  /**
   * composite primary key
   * => movieId, userId 두개의 컬럼이 합쳐져서 pk가 된다.
   * DB에서 확인하면 두 키에 프라이머리 키가 걸려있는 것을 확인할 수 있다.
   *
   * 똑같은 유저아이디와 영화아이디를 가지는 로우를 생성할 수가 없다! - 중복키에러 발생
   */

  @PrimaryColumn({
    name: 'movieId',
    type: 'int'
  })
  @ManyToOne(
    () => Movie,
    (movie) => movie.likedUsers,
    {
      onDelete: 'CASCADE'
    }
  )
  movie: Movie;

  @PrimaryColumn({
    name: 'userId',
    type: 'int'
  })
  @ManyToOne(
    () => User,
    (user) => user.likedMovies,
    {
      onDelete: 'CASCADE'
    }
  )
  user: User;

  @Column()
  isLike: boolean;
}