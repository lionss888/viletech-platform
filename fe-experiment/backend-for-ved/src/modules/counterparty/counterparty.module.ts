import { Module } from '@nestjs/common';
import { CounterpartyServiceModule } from './service/counterparty.service.module';
import { CounterpartyWebModule } from './web/counterparty.web.module';

@Module({
  imports: [CounterpartyServiceModule, CounterpartyWebModule],
  exports: [CounterpartyServiceModule, CounterpartyWebModule],
})
export class CounterpartyModule {}
