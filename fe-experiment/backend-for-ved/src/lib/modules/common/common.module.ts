import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { config as defaultConfig, GUARD_SERVICE } from 'lib/config';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminActivityInterceptor } from 'lib/interceptors/admin-activity.interceptor';
import { AdminActivityModule } from 'lib/modules/admin-activity/admin-activity.module';
import { AdminActivityServiceModule } from 'lib/modules/admin-activity/service/admin-activity.service.module';
import { ShutdownServiceModule } from 'lib/modules/shutdown/shutdown.service.module';
import { paginatePlugin } from '../../utils/mongoose/plugins/paginate.plugin';
import mongoose from 'mongoose';
import mongooseAutoPopulate from 'mongoose-autopopulate';
import paginate from 'mongoose-paginate';
import { RolesGuard } from '../../guards/roles.guard';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

interface CommonModuleParams {
  config?: () => any & { mongodb: { url: string }; serviceName: string };
}
@Module({})
export class CommonModule {
  static register({ config }: CommonModuleParams): DynamicModule {
    return {
      module: CommonModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [defaultConfig, config],
        }),
        NatsModule(GUARD_SERVICE),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            uri: configService.get<string>('mongodb.url'),
            connectionFactory: (connection: mongoose.Connection) =>
              connection.plugin(mongooseAutoPopulate).plugin(paginatePlugin).plugin(paginate),
          }),
          inject: [ConfigService],
        }),
        // ThrottlerModule.forRootAsync({
        //   imports: [ConfigModule],
        //   inject: [ConfigService],
        //   useFactory: () => ({ ttl: 60, limit: 250 }),
        // }),
        ShutdownServiceModule,
        AdminActivityModule,
        AdminActivityServiceModule,
        CacheModule.registerAsync({
          isGlobal: true,
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const options = configService.get('bullQueue.redis');
            let url = 'redis://';

            if (options.username && options.password) {
              url += `${options.username}:${options.password}@`;
            }

            url += `${options.host}:${options.port}`;

            return {
              stores: [createKeyv(url)],
            };
          },
        }),
      ],
      providers: [
        // { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_INTERCEPTOR, useClass: AdminActivityInterceptor },
      ],
    };
  }
}
