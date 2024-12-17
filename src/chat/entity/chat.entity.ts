import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { BaseTimeEntity } from '../../common/entity/base-time.entity';
import { ChatRoom } from './chat-room.entity';

@Entity()
export class Chat extends BaseTimeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.chats)
  author: User;

  @Column()
  message: string;

  @ManyToOne(() => ChatRoom, (chatRoom) => chatRoom.chats)
  chatRoom: ChatRoom;
}