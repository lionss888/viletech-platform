import { Module } from '@nestjs/common';
import { CurrencyServiceModule } from '../../service/currency.service.module';
import { CurrencyAdminController } from './currency-admin.controller';

@Module({
  imports: [CurrencyServiceModule],
  controllers: [CurrencyAdminController],
})
export class CurrencyAdminModule {}
