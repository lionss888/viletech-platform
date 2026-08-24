import { Socket as SocketIo } from 'socket.io';
import { IAccount } from '../lib/interfaces/models/account.interface';

declare module 'socket.io' {
  interface Socket extends SocketIo {
    account: IAccount;
  }
}
