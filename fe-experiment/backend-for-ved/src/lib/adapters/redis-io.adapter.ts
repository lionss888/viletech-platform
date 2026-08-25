import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';

type ReditOptions = {
  host: string;
  port: number;
  username?: string;
  password?: string;
};

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(configService: ConfigService): Promise<void> {
    const redisOptions = configService.get<ReditOptions>('bullQueue.redis');
    const url = this.getRedisUrl(redisOptions);

    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }

  private getRedisUrl(options: ReditOptions) {
    let url = 'redis://';

    if (options.username && options.password) {
      url += `${options.username}:${options.password}@`;
    }

    url += `${options.host}:${options.port}`;

    return url;
  }
}
