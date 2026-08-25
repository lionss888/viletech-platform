import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { ISocketMessageData } from '../../../lib/interfaces/models/socket.interface';
import { ISocketAnonymousService } from './socket.service.interface';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SocketQueue, SocketMessageChannel } from '../../../lib/enums/models/socket.enum';
import _ from 'lodash';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';

@Injectable()
@WebSocketGateway({
  namespace: '/api/1.0/socket/anonymous',
  path: '/api/1.0/socketio',
  cors: {
    origin: '*',
  },
})
export class SocketAnonymousService implements ISocketAnonymousService {
  @WebSocketServer()
  protected server: Namespace;

  constructor(@InjectQueue(JobQueueName.SOCKET_QUEUE) private readonly socketQueue: Queue) {}

  async broadcastOne<Payload = unknown>(socketMessage: ISocketMessageData<Payload>) {
    await this.socketQueue.add(SocketQueue.BROADCAST_ONE, { socketMessage });
  }

  async broadcastMany<Payload = unknown>(socketMessages: ISocketMessageData<Payload>[]) {
    const bulkSend = _.map(socketMessages, (socketMessage) => {
      return {
        name: SocketQueue.BROADCAST_ONE,
        data: { socketMessage },
      };
    });

    await this.socketQueue.addBulk(bulkSend);
  }

  async broadcast<Payload>(socketMessage: ISocketMessageData<Payload>) {
    if (socketMessage.room) {
      this.server.to(socketMessage.room).emit(SocketMessageChannel.NOTIFY, socketMessage);
      return;
    }
    this.server.emit(SocketMessageChannel.NOTIFY, socketMessage);
  }

  subscribe(socket: Socket, room: string) {
    socket.join(room);
  }
}
