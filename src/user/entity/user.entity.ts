import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseTimeEntity } from '../../common/entity/base-time.entity';
import { Exclude } from 'class-transformer';
import { Movie } from '../../movie/entity/movie.entity';
import { MovieUserLike } from '../../movie/entity/movie-user-like.entity';
import { Chat } from '../../chat/entity/chat.entity';
import { ChatRoom } from '../../chat/entity/chat-room.entity';

export enum Role {
  admin = 'admin',
  paidUser = 'paidUser',
  user = 'user'
}

@Entity()
export class User extends BaseTimeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  email: string;

  @Exclude({
    // 응답시
    toPlainOnly: true,
  })
  @Column()
  password: string;

  @Column({
    enum: Role,
    default: Role.user,
  })
  role: Role;

  @OneToMany(() => Movie, (movie) => movie.creator)
  createdMovies: Movie[];

  @OneToMany(() => MovieUserLike, (movieUserLike) => movieUserLike.user)
  likedMovies: MovieUserLike[];

  @OneToMany(() => Chat, (chat) => chat.author)
  chats: Chat[];

  @ManyToMany(() => ChatRoom, (chatRoom) => chatRoom.users)
  chatRooms: ChatRoom[];
}
