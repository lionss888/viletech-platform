import { Module, forwardRef } from '@nestjs/common';
import { FormPaymentTreasurerController } from './form-payment-treasurer.controller';
import { FormPaymentServiceModule } from '../../service/form-payment.service.module';
import { FileServiceModule } from '../../../file/service/file.service.module';
import { S3ServiceModule } from '../../../../lib/modules/s3/s3.service.module';

@Module({
  imports: [
    FormPaymentServiceModule,
    forwardRef(() => FileServiceModule),
    S3ServiceModule,
  ],
  controllers: [FormPaymentTreasurerController],
})
export class FormPaymentTreasurerModule {}
