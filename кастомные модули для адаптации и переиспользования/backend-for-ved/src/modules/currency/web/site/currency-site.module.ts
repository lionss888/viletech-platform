import { Module } from '@nestjs/common';
import { CurrencyServiceModule } from '../../service/currency.service.module';
import { CurrencySiteController } from './currency-site.controller';

@Module({
  imports: [CurrencyServiceModule],
  controllers: [CurrencySiteController],
})
export class CurrencySiteModule {}
