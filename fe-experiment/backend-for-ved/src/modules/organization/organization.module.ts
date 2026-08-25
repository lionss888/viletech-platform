import { Module } from '@nestjs/common';
import { OrganizationRpcModule } from './rpc/organization-rpc.module';
import { OrganizationSiteModule } from './web/site/organization-site.module';
import { OrganizationManagerModule } from './web/manager/organization-manager.module';
import { OrganizationProviderModule } from './web/provider/organization-provider.module';
import { OrganizationInternalComplianceOfficerModule } from './web/internal-compliance-officer/organization-internal-compliance-officer.module';

@Module({
  imports: [
    OrganizationSiteModule,
    OrganizationRpcModule,
    OrganizationManagerModule,
    OrganizationProviderModule,
    OrganizationInternalComplianceOfficerModule,
  ],
})
export class OrganizationModule {}
