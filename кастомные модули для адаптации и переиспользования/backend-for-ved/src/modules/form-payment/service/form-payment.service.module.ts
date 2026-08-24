import { Module, forwardRef } from '@nestjs/common';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { FormPaymentService } from './form-payment.service';
import { FormPayment, FormPaymentSchema } from './form-payment.schema';
import { FormPaymentStatusSchema, FormPaymentStatusSchemaFactory } from './history/form-payment-status.schema';
import { FormPaymentStatusService } from './history/form-payment-status.service';
import { NatsModule } from '../../../lib/modules/nats/nats.module';
import { FORM_PAYMENT_CLIENT, FORM_PAYMENT_SERVICE } from '../form-payment.constants';
import { Connection } from 'mongoose';
import { SequenceFactory } from '../../../lib/utils/mongoose/plugins/sequence/sequence';
import { OcrServiceModule } from '../../../lib/services/ocr/ocr.module';
import { BullModule } from '@nestjs/bull';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { FormPaymentOneCService } from './additional/form-payment-one-c.service';
import { GenerateDocsService } from './additional/generate-docs.service';
import { FormPaymentExcelService } from './form-payment-excel.service';
import { AutoProcessingService } from './auto-processing.service';
import { HsCodeIntegrationService } from './hs-code-integration.service';
import { ExcelParserModule } from 'lib/services/excel-parser/excel-parser.module';
import { TemplateServiceModule } from 'modules/template/service/template.service.module';
import { FileServiceModule } from 'modules/file/service/file.service.module';
import { S3ServiceModule } from 'lib/modules/s3/s3.service.module';
import { SocketServiceModule } from 'modules/socket/service/socket.service.module';
import { KonturServiceModule } from '../../../lib/services/kontur/kontur.service.module';
import { File, FileSchema } from 'modules/file/service/file.schema';
import { Payment, PaymentSchema } from 'modules/payment/service/payment.schema';
import { CounterpartyServiceModule } from 'modules/counterparty/service/counterparty.service.module';
import { HsCodeServiceModule } from '../../hs-code/service/hs-code.service.module';
import { ChatGptModule } from '../../../lib/services/chatgpt/chatgpt.module';
import { CommissionCalculationModule } from '../../../modules/commission-calculation';
import { CurrencyServiceModule } from '../../../modules/currency/service/currency.service.module';
import { VirtualAccountServiceModule } from '../../virtual-account/service/virtual-account.service.module';
import { VirtualAccountUpdateService } from './additional/virtual-account-update.service';
import { OrganizationServiceModule } from 'modules/organization/service/organization.service.module';
import { RateModule } from '../../rate';
import { TreasurerTaskServiceModule } from '../../treasurer-task/service/treasurer-task.service.module';
import { AccountServiceModule } from '../../account/service/account.service.module';
import { ContractServiceModule } from '../../contract/service/contract.service.module';
import { DiadocServiceModule } from '../../diadoc/service/diadoc.service.module';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: FormPayment.name,
        useFactory: async (connection: Connection) => {
          const schema = FormPaymentSchema;
          const AutoIncrement = SequenceFactory(connection);
          schema.plugin(AutoIncrement, { id: 'form-payment_uid', inc_field: 'uid', start_seq: 1 });
          return schema;
        },
        inject: [getConnectionToken()],
      },
    ]),
    MongooseModule.forFeature([
      { name: FormPayment.name, schema: FormPaymentSchema },
      { name: File.name, schema: FileSchema },
      { name: FormPaymentStatusSchema.name, schema: FormPaymentStatusSchemaFactory },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    NatsModule(FORM_PAYMENT_CLIENT),
    OcrServiceModule,
    KonturServiceModule,
    ChatGptModule,
    BullModule.registerQueue({ name: JobQueueName.LIQUIDITY_JOB_QUEUE }, { name: JobQueueName.FORM_PAYMENT_QUEUE }),
    ExcelParserModule,
    TemplateServiceModule,
    forwardRef(() => FileServiceModule),
    S3ServiceModule,
    SocketServiceModule,
    CounterpartyServiceModule,
    forwardRef(() => HsCodeServiceModule),
    forwardRef(() => OrganizationServiceModule),
    VirtualAccountServiceModule,
    CommissionCalculationModule,
    AccountServiceModule,
    CurrencyServiceModule,
    RateModule,
    forwardRef(() => TreasurerTaskServiceModule),
    ContractServiceModule,
    DiadocServiceModule, // VF-2: Интеграция с Diadoc
  ],
  providers: [
    FormPaymentStatusService,
    VirtualAccountUpdateService,
    {
      provide: FORM_PAYMENT_SERVICE,
      useClass: FormPaymentService,
    },
    {
      provide: 'IFormPaymentOneCService',
      useClass: FormPaymentOneCService,
    },
    {
      provide: 'IFormPaymentGenerateDocsService',
      useClass: GenerateDocsService,
    },
    {
      provide: 'IFormPaymentExcelService',
      useClass: FormPaymentExcelService,
    },
    AutoProcessingService,
    HsCodeIntegrationService,
  ],
  exports: [
    MongooseModule,
    BullModule,
    {
      provide: FORM_PAYMENT_SERVICE,
      useClass: FormPaymentService,
    },
    {
      provide: 'IFormPaymentOneCService',
      useClass: FormPaymentOneCService,
    },
    {
      provide: 'IFormPaymentGenerateDocsService',
      useClass: GenerateDocsService,
    },
    {
      provide: 'IFormPaymentExcelService',
      useClass: FormPaymentExcelService,
    },
    AutoProcessingService,
    HsCodeIntegrationService,
    ExcelParserModule,
    TemplateServiceModule,
    S3ServiceModule,
    SocketServiceModule,
  ],
})
export class FormPaymentServiceModule {}
