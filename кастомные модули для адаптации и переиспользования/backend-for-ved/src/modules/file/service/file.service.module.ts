import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { File, FileSchema } from './file.schema';
import { FileService } from './file.service';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { FILE_CLIENT, FILE_SERVICE } from '../file.constants';
import { S3ServiceModule } from 'lib/modules/s3/s3.service.module';
import { OcrServiceModule } from '../../../lib/services/ocr/ocr.module';
import { HttpModule } from '@nestjs/axios';
import { AnthropicModule } from '../../../lib/services/anthropic/anthropic.module';
import { NodulModule } from '../../../lib/services/nodul/nodul.module';
import { FormPaymentServiceModule } from '../../form-payment/service/form-payment.service.module';
import { OrganizationServiceModule } from '../../organization/service/organization.service.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: File.name,
        schema: FileSchema,
      },
    ]),
    NatsModule(FILE_CLIENT),
    S3ServiceModule,
    OcrServiceModule,
    HttpModule,
    AnthropicModule,
    NodulModule,
    forwardRef(() => FormPaymentServiceModule),
    forwardRef(() => OrganizationServiceModule),
  ],
  providers: [{ provide: FILE_SERVICE, useClass: FileService }],
  exports: [{ provide: FILE_SERVICE, useClass: FileService }],
})
export class FileServiceModule {}
