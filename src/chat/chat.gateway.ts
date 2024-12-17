import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { WsTransactionInterceptor } from '../common/interceptor/ws-transaction.interceptor';
import { WsQueryRunnerDeco } from '../common/decorator/ws-query-runner.decorator';
import { QueryRunner } from 'typeorm';
import { CreateChatDto } from './create-chat.dto';

//* http 통신과 다르게 전역 파이프설정이 안먹어서 따로 게이트웨이에 적용해 줘야 한다.
@UsePipes(new ValidationPipe({
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  whitelist: true,
  forbidNonWhitelisted: true,
}))
@WebSocketGateway()
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
  ) {}

  /**
   * OnGatewayInit 인터페이스를 구현하면 afterInit 메소드를 구현해야 한다.
   * 여기서는 서버가 초기화되었을 때 실행되는 메소드
   */
  afterInit(server: any): any {
    console.log('init socket server');
  }

  /**
   * OnGatewayConnection 인터페이스를 구현하면 handleConnection 메소드를 구현해야 한다.
   *
   * 클라이언트가 연결되었을 때 실행되는 메소드
   * 여기서는 클라이언트의 토큰을 검증하고, 검증된 토큰의 정보를 클라이언트에 저장하도록 구현
   */
  async handleConnection(client: Socket) {
    try {
      const rawToken = client.handshake.headers.authorization;

      if (!rawToken) {
        client.disconnect();
        return;
      }

      const payload = await this.authService.parseBearerToken(rawToken, false);

      if (payload) {
        client.data.user = payload;
        this.chatService.registerClient(payload.sub, client);
        await this.chatService.joinUserRooms(payload, client);
      } else {
        client.disconnect();
      }
    } catch (e) {
      console.log('socker connect error:::', e);
      //! 에러가 발생하면 무조건 연결을 종료시킨다.
      client.disconnect();
    }
  }

  /**
   * OnGatewayDisconnect 인터페이스를 구현하면 handleDisconnect 메소드를 구현해야 한다.
   *
   * 클라이언트가 연결이 끊겼을 때 실행되는 메소드
   * 여기서는 클라이언트의 정보를 삭제하도록 구현
   */
  handleDisconnect(client: any): any {
    const user = client.data.user;

    if (user) {
      this.chatService.removeClient(user.sub);
    }
  }

  //* NestJS를 사용함으로써 Interceptor, decorator등을 http통신과 동일하게 사용할 수 있다.
  @SubscribeMessage('sendMessage')
  @UseInterceptors(WsTransactionInterceptor)
  async handleMessage(
    @MessageBody() body: CreateChatDto,
    @ConnectedSocket() client: Socket,
    @WsQueryRunnerDeco() qr: QueryRunner,
  ) {
    const payload = client.data.user;
    await this.chatService.createMessage(payload, body, qr);
  }
}
