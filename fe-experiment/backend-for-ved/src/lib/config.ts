import { config as dotConfig } from 'dotenv';
import { NatsOptions } from '@nestjs/microservices';

dotConfig();

export const GUARD_SERVICE = 'GUARD_SERVICE';

export const ROUTE_NAME = 'ROUTE_NAME';

export const config = () => ({
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: process.env.PORT,
  mongodb: {
    url: process.env.MONGODB_URL,
  },
  nats: {
    servers: [process.env.NATS_URL || 'nats://0.0.0.0:4222'],
  } as NatsOptions,

  whiteListDomain: [],
  whiteListIp: [''],
});
