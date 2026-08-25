import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { DiadocService } from './diadoc.service';
import { DiadocStatusCheckerService } from './diadoc-status-checker.service';
import { DiadocWebhookProcessorService } from './diadoc-webhook-processor.service';
import { DiadocMetricsService } from './diadoc-metrics.service';
import { DiadocErrorHandler } from './diadoc-error-handler';
import { DiadocExpirationCheckerService } from './diadoc-expiration-checker.service';
import { DiadocXmlGeneratorService } from './diadoc-xml-generator.service';
import { DiadocMetrics, DiadocMetricsSchema } from './diadoc-metrics.schema';
import { FormPaymentServiceModule } from '../../form-payment/service/form-payment.service.module';
import { ContractServiceModule } from '../../contract/service/contract.service.module';
import { FileServiceModule } from '../../file/service/file.service.module';
import { FormPayment, FormPaymentSchema } from '../../form-payment/service/form-payment.schema';
import { Contract, ContractSchema } from '../../contract/service/contract.schema';

/**
 * VF-2: Модуль сервисов Diadoc
 * Содержит все сервисы для интеграции с Diadoc API
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,
      maxRedirects: 5,
    }),
    ConfigModule,
    forwardRef(() => FormPaymentServiceModule),
    forwardRef(() => ContractServiceModule),
    forwardRef(() => FileServiceModule),
    MongooseModule.forFeature([
      { name: FormPayment.name, schema: FormPaymentSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: 'DiadocMetrics', schema: DiadocMetricsSchema },
    ]),
  ],
  providers: [
    {
      provide: DIADOC_SERVICE,
      useClass: DiadocService,
    },
    DiadocService,
    DiadocStatusCheckerService,
    DiadocWebhookProcessorService,
    DiadocMetricsService,
    DiadocErrorHandler,
    // VF-2 FIX: Сервис проверки истечения срока подписания (3 дня)
    DiadocExpirationCheckerService,
    // VF-2: Сервис генерации XML документов
    DiadocXmlGeneratorService,
  ],
  exports: [
    DIADOC_SERVICE,
    DiadocService,
    DiadocWebhookProcessorService,
    DiadocMetricsService,
    DiadocErrorHandler,
    DiadocExpirationCheckerService,
    DiadocXmlGeneratorService,
  ],
})
export class DiadocServiceModule {}
