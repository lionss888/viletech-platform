import { Socket } from 'socket.io';
import { NatsClientProxy } from '../modules/nats/nats-client-proxy';
import { JwtService } from '@nestjs/jwt';
import { AccountPattern } from '../enums/models/account.enums';
import moment from 'moment';
import { IAccount } from '../interfaces/models/account.interface';

export const wsAuthMiddleware = (client: NatsClientProxy, jwt: JwtService) => {
  const usedTokens = new Map<string, NodeJS.Timeout>();

  return async (socket: Socket, next: (err?: Error & { data?: any }) => void) => {
    try {
      const token = (socket.handshake.auth.token as string) || (socket.handshake.query.token as string);

      if (usedTokens.has(token)) {
        throw new Error('Token already used');
      }

      const payload = jwt.verify(token);

      // Connection token содержит { account: '...' }, а не { _id: '...' }
      const accountId = payload.account || payload._id;

      const account = await client.send<IAccount>(AccountPattern.FIND_ONE_OR_EXCEPTION, {
        query: {
          _id: accountId,
        },
      });

      if (!account.active) {
        throw new Error('User not confirmed');
      }

      if (account.blocked) {
        throw new Error('User is blocked');
      }

      socket.account = account;

      // Определяем timeout для cleanup токена
      let timeoutMs: number;

      if (payload.exp) {
        const expirationDate = moment(payload.exp * 1000);
        timeoutMs = expirationDate.diff(moment(), 'milliseconds');

        if (timeoutMs <= 0) {
          throw new Error('Token expired');
        }
      } else {
        // Для токенов без expiration используем 1 час по умолчанию
        timeoutMs = 3600000;
      }

      // Устанавливаем timeout для cleanup
      const timeoutId = setTimeout(() => {
        usedTokens.delete(token);
      }, timeoutMs);

      usedTokens.set(token, timeoutId);

      // Очищаем токен при disconnect
      socket.on('disconnect', () => {
        const existingTimeout = usedTokens.get(token);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          usedTokens.delete(token);
        }
      });

      next();
    } catch (e) {
      next(e);
    }
  };
};
