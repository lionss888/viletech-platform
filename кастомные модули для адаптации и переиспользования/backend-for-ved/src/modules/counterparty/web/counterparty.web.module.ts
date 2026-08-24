import { Module } from '@nestjs/common';
import { CounterpartyServiceModule } from '../service/counterparty.service.module';
import { CounterpartyController } from './counterparty.controller';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { GUARD_SERVICE } from 'lib/config';

@Module({
  imports: [CounterpartyServiceModule, NatsModule(GUARD_SERVICE)],
  controllers: [CounterpartyController],
  providers: [],
  exports: [CounterpartyServiceModule],
})
export class CounterpartyWebModule {}
