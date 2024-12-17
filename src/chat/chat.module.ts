import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entity/chat-room.entity';
import { Chat } from './entity/chat.entity';
import { User } from '../user/entity/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoom,
      Chat,
      User
    ]),
    AuthModule
  ],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
