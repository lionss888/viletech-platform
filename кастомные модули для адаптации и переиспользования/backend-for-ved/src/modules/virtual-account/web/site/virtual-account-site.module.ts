import { Module } from '@nestjs/common';
import { VirtualAccountSiteController } from './virtual-account-site.controller';
import { VirtualAccountServiceModule } from '../../service/virtual-account.service.module';

@Module({
  imports: [VirtualAccountServiceModule],
  controllers: [VirtualAccountSiteController],
})
export class VirtualAccountSiteModule {}
