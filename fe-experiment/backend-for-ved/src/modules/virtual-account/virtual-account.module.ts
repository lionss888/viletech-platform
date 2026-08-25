import { Module } from '@nestjs/common';
import { VirtualAccountServiceModule } from './service/virtual-account.service.module';
import { VirtualAccountSiteModule } from './web/site/virtual-account-site.module';

@Module({
  imports: [VirtualAccountServiceModule, VirtualAccountSiteModule],
})
export class VirtualAccountModule {}
