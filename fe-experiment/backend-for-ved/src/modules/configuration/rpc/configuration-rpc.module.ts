import { Module } from '@nestjs/common';
import { ConfigurationServiceModule } from '../service/configuration.service.module';
import { ConfigurationRpcController } from './configuration-rpc.controller';

@Module({
  imports: [ConfigurationServiceModule],
  controllers: [ConfigurationRpcController],
})
export class ConfigurationRpcModule {}
