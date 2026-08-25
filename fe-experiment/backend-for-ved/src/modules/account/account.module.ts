import { Module } from '@nestjs/common';
import { AccountRPCModule } from './rpc/account-rpc.module';
import { AccountSiteModule } from './web/site/account-site.module';
import { AccountAdminModule } from './web/admin/account-admin.module';
import { AccountProviderModule } from './web/provider/account-provider.module';
import { AccountComplianceOfficerModule } from './web/compliance-officer/account-compliance-officer.module';
import { AccountManagerModule } from './web/manager/account-manager.module';
import { AccountRateSettingsModule } from './web/admin-rate-settings/account-rate-settings.module';
import { AccountTreasurerModule } from './web/treasurer/account-treasurer.module';

@Module({
  imports: [
    AccountRPCModule,
    AccountSiteModule,
    AccountAdminModule,
    AccountProviderModule,
    AccountComplianceOfficerModule,
    AccountManagerModule,
    AccountRateSettingsModule,
    AccountTreasurerModule,
  ],
})
export class AccountModule {}
