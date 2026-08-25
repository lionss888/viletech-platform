import { ISocketMessage, ISocketMessageData } from 'lib/interfaces/models/socket.interface';
import { Socket } from 'socket.io';

export interface ISocketAuthorizedService {
  negotiateConnection(data: INegotiateConnection): Promise<INegotiateConnectionResult>;

  sendOne<Payload = unknown>(socketMessage: ISocketMessage<Payload>): Promise<void>;

  sendMany<Payload = unknown>(socketMessages: ISocketMessage<Payload>[]): Promise<void>;

  sendSocket<Payload = unknown>(socketMessage: ISocketMessage<Payload>): Promise<void>;

  checkAccountConnection(account: string): boolean;

  checkAccountsConnection(accounts: string[]): string[];

  disconnectOne(data: IDisconnectOne): Promise<void>;

  subscribe(socket: Socket, room: string): void;

  broadcast<Payload = unknown>(socketMessage: ISocketMessageData<Payload>): Promise<void>;

  broadcastMany<Payload = unknown>(socketMessages: ISocketMessageData<Payload>[]): Promise<void>;
}

export interface ISocketAnonymousService {
  broadcastOne<Payload = unknown>(socketMessage: ISocketMessageData<Payload>): Promise<void>;

  broadcastMany<Payload = unknown>(socketMessage: ISocketMessageData<Payload>[]): Promise<void>;

  broadcast<Payload = unknown>(socketMessage: ISocketMessageData<Payload>): Promise<void>;

  subscribe(socket: Socket, room: string): void;
}

export interface INegotiateConnection {
  account: string;
}

export interface INegotiateConnectionResult {
  connectionToken: string;
}

export interface IDisconnectOne {
  account: string;
}
