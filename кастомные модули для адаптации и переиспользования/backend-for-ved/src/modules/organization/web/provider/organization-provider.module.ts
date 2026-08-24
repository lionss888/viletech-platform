import { Module } from '@nestjs/common';
import { OrganizationProviderController } from './organization-provider.controller';
import { OrganizationServiceModule } from '../../service/organization.service.module';

@Module({
  imports: [OrganizationServiceModule],
  controllers: [OrganizationProviderController],
})
export class OrganizationProviderModule {}
