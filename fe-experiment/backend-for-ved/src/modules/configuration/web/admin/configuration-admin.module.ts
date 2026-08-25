import { Module } from '@nestjs/common';
import { ConfigurationServiceModule } from '../../service/configuration.service.module';
import { ConfigurationAdminController } from './configuration-admin.controller';

@Module({
  imports: [ConfigurationServiceModule],
  controllers: [ConfigurationAdminController],
})
export class ConfigurationAdminModule {}
