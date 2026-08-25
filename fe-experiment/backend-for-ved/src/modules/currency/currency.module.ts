import { Module } from '@nestjs/common';
import { CurrencyRPCModule } from './rpc/currency-rpc.module';
import { CurrencyAdminModule } from './web/admin/currency-admin.module';
import { CurrencySiteModule } from './web/site/currency-site.module';

@Module({
  imports: [CurrencyRPCModule, CurrencySiteModule, CurrencyAdminModule],
})
export class CurrencyModule {}
