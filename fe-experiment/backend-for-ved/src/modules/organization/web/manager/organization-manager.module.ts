import { Module } from '@nestjs/common';
import { OrganizationManagerController } from './organization-manager.controller';
import { OrganizationServiceModule } from '../../service/organization.service.module';

@Module({
  imports: [OrganizationServiceModule],
  controllers: [OrganizationManagerController],
})
export class OrganizationManagerModule {}
