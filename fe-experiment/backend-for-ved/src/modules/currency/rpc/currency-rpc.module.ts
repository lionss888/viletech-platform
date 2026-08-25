import { Module } from '@nestjs/common';
import { CurrencyRPCController } from './currency-rpc.controller';
import { CurrencyServiceModule } from '../service/currency.service.module';

@Module({
  imports: [CurrencyServiceModule],
  controllers: [CurrencyRPCController],
})
export class CurrencyRPCModule {}
