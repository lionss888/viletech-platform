import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ClientsModuleAsyncOptions } from '@nestjs/microservices/module/interfaces/clients-module.interface';
import { DynamicModule, Module } from '@nestjs/common';
import { GetNatsClientProxy } from './nats-client-proxy';

export const NatsModule = (serviceName: string): DynamicModule => {
  @Module({})
  class NatsModule {}

  const ClientProxyClass = GetNatsClientProxy(serviceName);

  return {
    module: NatsModule,
    imports: [
      ClientsModule.registerAsync([
        {
          name: serviceName,
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            options: configService.get('nats'),
            transport: Transport.NATS,
          }),
        },
      ] as ClientsModuleAsyncOptions),
    ],
    providers: [{ provide: ClientProxyClass.name, useClass: ClientProxyClass }],
    exports: [{ provide: ClientProxyClass.name, useClass: ClientProxyClass }],
  };
};
