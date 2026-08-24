import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Currency, CurrencySchema } from './currency.schema';
import { CurrencyService } from './currency.service';
import { CURRENCY_CLIENT } from '../currency.contants';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { OpexSModule } from '../../../lib/services/currency/opex/opex.service.module';
import { CbrModule } from 'lib/services/currency/cbr/cbr.service.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Currency.name, schema: CurrencySchema }]),
    NatsModule(CURRENCY_CLIENT),
    OpexSModule,
    CbrModule,
  ],
  providers: [{ provide: 'ICurrencyService', useClass: CurrencyService }],
  exports: [{ provide: 'ICurrencyService', useClass: CurrencyService }],
})
export class CurrencyServiceModule {}
