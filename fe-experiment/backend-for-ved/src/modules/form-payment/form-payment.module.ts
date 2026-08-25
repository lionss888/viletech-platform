import { Module } from '@nestjs/common';
import { FormPaymentSiteModule } from './web/site/form-payment-site.module';
import { FormPaymentAdminModule } from './web/admin/form-payment-admin.module';
import { FormPaymentManagerModule } from './web/manager/form-payment-manager.module';
import { FormPaymentProviderModule } from './web/provider/form-payment-provider.module';
import { FormPaymentComplianceOfficerModule } from './web/compliance-officer/form-payment-manager.module';
import { FormPaymentRpcModule } from './rpc/form-payment-rpc.module';
import { FormPaymentQueueModule } from './queue/form-payment-queue.module';
import { FormPaymentOneCModule } from './web/one-c/form-payment-one-c.module';
import { FormPaymentInternalComplianceOfficerModule } from './web/internal-compliance-officer/form-payment-internal-compliance-officer.module';
import { ChatGptQueueModule } from '../../lib/services/chatgpt/queue/chatgpt-queue.module';
import { FormPaymentTreasurerModule } from './web/treasurer/form-payment-treasurer.module';

@Module({
  imports: [
    FormPaymentRpcModule,
    FormPaymentSiteModule,
    FormPaymentAdminModule,
    FormPaymentManagerModule,
    FormPaymentProviderModule,
    FormPaymentInternalComplianceOfficerModule,
    FormPaymentQueueModule,
    FormPaymentComplianceOfficerModule,
    FormPaymentOneCModule,
    ChatGptQueueModule,
    FormPaymentTreasurerModule,
  ],
})
export class FormPaymentModule {}
