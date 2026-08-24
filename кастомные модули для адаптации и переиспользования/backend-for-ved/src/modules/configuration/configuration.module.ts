import { Module } from '@nestjs/common';
import { ConfigurationAdminModule } from './web/admin/configuration-admin.module';
import { ConfigurationRpcModule } from './rpc/configuration-rpc.module';

@Module({
  imports: [ConfigurationAdminModule, ConfigurationRpcModule],
})
export class ConfigurationModule {}
