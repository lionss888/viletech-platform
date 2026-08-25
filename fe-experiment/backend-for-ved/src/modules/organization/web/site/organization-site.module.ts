import { Module } from '@nestjs/common';
import { OrganizationSiteController } from './organization-site.controller';
import { OrganizationServiceModule } from '../../service/organization.service.module';
import { KonturServiceModule } from 'lib/services/kontur/kontur.service.module';

@Module({
  imports: [OrganizationServiceModule, KonturServiceModule],
  controllers: [OrganizationSiteController],
})
export class OrganizationSiteModule {}
