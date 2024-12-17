import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatRoom } from './entity/chat-room.entity';
import { QueryRunner, Repository } from 'typeorm';
import { Chat } from './entity/chat.entity';
import { Role, User } from '../user/entity/user.entity';
import { CreateChatDto } from './create-chat.dto';
import { WsException } from '@nestjs/websockets';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class ChatService {
  //* 언제 클라이언트쪽으로 메시지를 보내게 될지 모르기때문에 클라이언트의 소켓을 저장해두는 배열을 만들어둔다.
  private readonly connectedClients = new Map<number, Socket>();

  constructor(
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  registerClient(userId: number, client: Socket) {
    this.connectedClients.set(userId, client);
  }

  removeClient(userId: number) {
    this.connectedClients.delete(userId);
  }

  async joinUserRooms(user: { sub: number }, client: Socket) {
    const chatRooms = await this.chatRoomRepository
      .createQueryBuilder('chatRoom')
      .innerJoin('chatRoom.users', 'user', 'user.id = :userId', {
        userId: user.sub,
      })
      .getMany();

    chatRooms.forEach((room) => {
      client.join(room.id.toString());
    });
  }

  async createMessage(
    payload: { sub: number },
    { message, room }: CreateChatDto,
    qr: QueryRunner,
  ) {
    const user = await this.userRepository.findOne({
      where: {
        id: payload.sub,
      },
      // select: ['id', 'email'],
    });

    const chatRoom = await this.getOrCreateChatRoom(user, qr, room);

    const msgModel = await qr.manager.save(Chat, {
      author: user,
      message,
      chatRoom
    });

    const client = this.connectedClients.get(user.id);

    // client.to(chatRoom.id.toString()).emit('newMessage', plainToClass(Chat, msgModel));
    client.to(chatRoom.id.toString()).emit('newMessage', instanceToPlain(msgModel));

    return message;
  }

  async getOrCreateChatRoom(user: User, qr: QueryRunner, room?: number) {
    //* 어드민의 경우 먼저 채팅방을 생성하지는 않을 것이고 특정 방을 지정해 메시지를 보냄
    if (user.role === Role.admin) {
      if (!room) {
        // 웹소켓 전용 Exception
        throw new WsException('어드민은 room 값이 필수 입니다.');
      }
      return await qr.manager.findOne(ChatRoom, {
        where: {
          id: room,
        },
        relations: ['users'],
      });
    }

    let chatRoom = await qr.manager
      .createQueryBuilder(ChatRoom, 'chatRoom')
      .innerJoin('chatRoom.users', 'user')
      .where('user.id = :userId', { userId: user.id })
      .getOne();

    if (!chatRoom) {
      const adminUser = await qr.manager.findOne(User, {
        where: { role: Role.admin },
      });

      chatRoom = await this.chatRoomRepository.save({
        users: [user, adminUser],
      });

      [user.id, adminUser.id].forEach((userId) => {
        const client = this.connectedClients.get(userId);

        if (client) {
          client.emit('roomCreated', chatRoom.id);
          client.join(chatRoom.id.toString());
        }
      });
    }

    return chatRoom;
  }
}
