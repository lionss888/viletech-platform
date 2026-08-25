import { Module } from '@nestjs/common';
import { RateService } from './service/rate.service';
import { RATE_SERVICE } from './service/rate.service.interface';
import { CurrencyServiceModule } from '../currency/service/currency.service.module';

@Module({
  imports: [CurrencyServiceModule],
  providers: [
    {
      provide: RATE_SERVICE,
      useClass: RateService,
    },
  ],
  exports: [RATE_SERVICE],
})
export class RateModule {}
