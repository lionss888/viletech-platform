import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { bootstrap } from 'lib/bootstrap';
import { Transport } from '@nestjs/microservices/enums';
import { NatsOptions } from '@nestjs/microservices';
import { RedisIoAdapter } from './lib/adapters/redis-io.adapter';
import { FileOneCModule } from './modules/file/web/one-c/file-one-c.module';
import { FormPaymentOneCModule } from './modules/form-payment/web/one-c/form-payment-one-c.module';
import { AuthOneCModule } from './modules/auth/web/one-c/auth-one-c.module';
import { PaymentOneCModule } from './modules/payment/web/one-c/payment-one-c.module';
import { AgentOneCModule } from './modules/agent/web/one-c/agent-one-c.module';

bootstrap({
  AppModule,
  serviceName: 'fea360',
  addMiddlewares: (app) => {
    app.use(cookieParser());
  },
  microservicesOptions: (configService) => [
    { transport: Transport.NATS, options: configService.get('nats') } as NatsOptions,
  ],
  connectWsAdapter: async (app, configService) => {
    const redisIoAdapter = new RedisIoAdapter(app);
    await redisIoAdapter.connectToRedis(configService);

    app.useWebSocketAdapter(redisIoAdapter);
  },
  additionalOneCSwaggerOptions: {
    include: [FileOneCModule, FormPaymentOneCModule, AuthOneCModule, PaymentOneCModule, AgentOneCModule],
  },
});
