import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { ISocketMessage, ISocketMessageData } from 'lib/interfaces/models/socket.interface';
import { wsAuthMiddleware } from 'lib/middlewares/ws-auth.middleware';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SocketMessageChannel, SocketQueue } from 'lib/enums/models/socket.enum';
import * as _ from 'lodash';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { InjectNats, NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import {
  IDisconnectOne,
  INegotiateConnection,
  INegotiateConnectionResult,
  ISocketAuthorizedService,
} from './socket.service.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EXCEL_LIMITS } from 'lib/constants/excel.constants';

@Injectable()
@WebSocketGateway({
  namespace: '/api/1.0/socket/authorized',
  path: '/api/1.0/socketio',
  cors: {
    origin: '*',
  },
})
export class SocketAuthorizedService
  implements ISocketAuthorizedService, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  protected server: Namespace;
  private connectedAccounts = new Map<string, number>();
  private readonly logger = new Logger(SocketAuthorizedService.name);
  private readonly isSocketLogsEnabled: boolean;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectNats() readonly client: NatsClientProxy,
    @InjectQueue(JobQueueName.SOCKET_QUEUE) private readonly socketQueue: Queue,
  ) {
    this.isSocketLogsEnabled = this.configService.get<boolean>('socket.logs.enabled') === true;
  }

  private socketDebug(message: string) {
    if (!this.isSocketLogsEnabled) return;
    this.logger.debug(message);
  }

  afterInit(server: Namespace) {
    const middle = wsAuthMiddleware(this.client, this.jwtService);
    server.use(middle);
  }

  async negotiateConnection(data: INegotiateConnection): Promise<INegotiateConnectionResult> {
    const connectionToken = this.jwtService.sign(data, this.configService.get('tokens.connectionToken'));

    return {
      connectionToken,
    };
  }

  async handleConnection(socket: Socket) {
    const accountId = socket.account?._id?.toString() || 'unknown';
    const roles = socket.account?.roles || [];
    this.socketDebug(`handleConnection: socket=${socket.id}, account=${accountId}`);

    // Подписываем на комнату по ID аккаунта
    socket.join(accountId);

    // Подписываем на комнаты по ролям
    for (const role of roles) {
      const roleRoom = `role:${role}`;
      socket.join(roleRoom);
      this.socketDebug(`Account ${accountId} joined role room: ${roleRoom}`);
    }

    // Подписываем на общую комнату для привилегированных ролей (если есть хотя бы одна)
    const privilegedRoles = ['manager', 'provider', 'senior_provider', 'root', 'treasurer'];
    const hasPrivilegedRole = roles.some((role) => privilegedRoles.includes(role.toLowerCase()));
    if (hasPrivilegedRole) {
      socket.join('role:privileged');
      this.logger.debug(`Account ${accountId} joined privileged room`);
    }

    const count = this.connectedAccounts.get(accountId) ?? 0;
    this.connectedAccounts.set(accountId, count + 1);

    this.socketDebug(`Account ${accountId} connected, total connections: ${count + 1}`);
  }

  async handleDisconnect(socket: Socket) {
    const accountId = socket.account?._id?.toString() || 'unknown';
    this.socketDebug(`handleDisconnect: socket=${socket.id}, account=${accountId}`);

    const count = this.connectedAccounts.get(accountId);
    if (count === undefined) {
      this.socketDebug(`Disconnect called for untracked account: ${accountId}`);
      return;
    }

    const newCount = count - 1;
    if (newCount > 0) {
      this.connectedAccounts.set(accountId, newCount);
    } else {
      this.connectedAccounts.delete(accountId);
    }

    this.socketDebug(`Account ${accountId} disconnected, remaining connections: ${newCount}`);
  }

  async sendOne<Payload = unknown>(socketMessage: ISocketMessage<Payload>) {
    // По умолчанию Bull делает 10^9 попыток, переопределяем на вменяемые 5
    await this.socketQueue.add(
      SocketQueue.SEND_ONE,
      { socketMessage },
      {
        attempts: EXCEL_LIMITS.SOCKET_QUEUE_RETRY.ATTEMPTS,
        backoff: {
          type: EXCEL_LIMITS.SOCKET_QUEUE_RETRY.BACKOFF_TYPE,
          delay: EXCEL_LIMITS.SOCKET_QUEUE_RETRY.BACKOFF_DELAY_MS,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );
  }

  async sendMany<Payload = unknown>(socketMessages: ISocketMessage<Payload>[]) {
    const bulkSend = _.map(socketMessages, (socketMessage) => {
      return {
        name: SocketQueue.SEND_ONE,
        data: { socketMessage },
        opts: {
          attempts: EXCEL_LIMITS.SOCKET_QUEUE_RETRY.ATTEMPTS,
          backoff: {
            type: EXCEL_LIMITS.SOCKET_QUEUE_RETRY.BACKOFF_TYPE,
            delay: EXCEL_LIMITS.SOCKET_QUEUE_RETRY.BACKOFF_DELAY_MS,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      };
    });

    await this.socketQueue.addBulk(bulkSend);
  }

  async sendSocket<Payload = unknown>(socketMessage: ISocketMessage<Payload>) {
    const accountId = socketMessage.account.toString();
    const isConnected = this.checkAccountConnection(accountId);

    const eventType =
      socketMessage.data.payload &&
      typeof socketMessage.data.payload === 'object' &&
      'eventType' in socketMessage.data.payload
        ? (socketMessage.data.payload as { eventType?: string }).eventType
        : 'N/A';

    this.socketDebug(`sendSocket: account=${accountId}, connected=${isConnected}, eventType=${eventType || 'N/A'}`);

    if (isConnected) {
      this.server.to(accountId).emit(SocketMessageChannel.NOTIFY, socketMessage.data);
      this.socketDebug(`Event emitted to room: ${accountId}`);
    } else {
      this.socketDebug(`Account ${accountId} not connected - event not sent`);
    }
  }

  async disconnectOne(data: IDisconnectOne): Promise<void> {
    // fetchSockets() возвращает RemoteSocket[], но нам нужен Socket[] с полем account
    // Socket.IO типы не экспортируют правильный тип для этого кейса
    const sockets = (await this.server.fetchSockets()) as unknown as Socket[];

    const accountSockets = sockets.filter((socket) => socket.account._id === data.account);

    accountSockets.forEach((socket) => socket.disconnect(true));
  }

  checkAccountConnection(account: string): boolean {
    return this.connectedAccounts.has(account);
  }

  checkAccountsConnection(accounts: string[]): string[] {
    const connectedAccounts: string[] = [];

    for (const account of accounts) {
      this.checkAccountConnection(account) && connectedAccounts.push(account);
    }

    return connectedAccounts;
  }
  subscribe(socket: Socket, room: string) {
    socket.join(room);
  }

  @SubscribeMessage('leave')
  handleLeave(@MessageBody() payload: { room?: string }, @ConnectedSocket() socket: Socket) {
    if (payload?.room) {
      socket.leave(payload.room);
    }
  }

  async broadcastMany<Payload = unknown>(socketMessages: ISocketMessageData<Payload>[]): Promise<void> {
    const bulkSend = _.map(socketMessages, (socketMessage) => ({
      name: SocketQueue.BROADCAST_ONE_AUTHORIZED,
      data: { socketMessage },
    }));

    await this.socketQueue.addBulk(bulkSend);
  }

  async broadcast<Payload = unknown>(socketMessage: ISocketMessageData<Payload>): Promise<void> {
    if (socketMessage.room) {
      this.server.to(socketMessage.room).emit(SocketMessageChannel.NOTIFY, socketMessage);
      return;
    }
    this.server.emit(SocketMessageChannel.NOTIFY, socketMessage);
  }
}
