import { Module } from '@nestjs/common';
import { CommissionCalculationService } from './service/commission-calculation.service';
import { COMMISSION_CALCULATION_SERVICE } from './service/commission-calculation.service.interface';
import { CurrencyServiceModule } from '../currency/service/currency.service.module';

@Module({
  imports: [CurrencyServiceModule],
  providers: [
    {
      provide: COMMISSION_CALCULATION_SERVICE,
      useClass: CommissionCalculationService,
    },
  ],
  exports: [COMMISSION_CALCULATION_SERVICE],
})
export class CommissionCalculationModule {}
