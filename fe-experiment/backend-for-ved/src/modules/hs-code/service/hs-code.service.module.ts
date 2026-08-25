import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HsCode, HsCodeSchema } from './hs-code.schema';
import { HsCodeService } from './hs-code.service';
import { ProviderMatchingService } from './provider-matching.service';
import { FormPaymentServiceModule } from '../../form-payment/service/form-payment.service.module';
import { OrganizationServiceModule } from '../../organization/service/organization.service.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: HsCode.name, schema: HsCodeSchema }]),
    forwardRef(() => FormPaymentServiceModule),
    forwardRef(() => OrganizationServiceModule),
  ],
  providers: [{ provide: 'IHsCodeService', useClass: HsCodeService }, ProviderMatchingService],
  exports: [{ provide: 'IHsCodeService', useClass: HsCodeService }, ProviderMatchingService],
})
export class HsCodeServiceModule {}
