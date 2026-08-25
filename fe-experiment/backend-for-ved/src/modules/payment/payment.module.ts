import { Module } from '@nestjs/common';
import { PaymentQueueModule } from './queue/payment-queue.module';
import { PaymentOneCModule } from './web/one-c/payment-one-c.module';
import { PaymentAdminModule } from './web/admin/payment-admin.module';
import { PaymentManagerModule } from './web/manager/payment-manager.module';

@Module({
  imports: [PaymentQueueModule, PaymentOneCModule, PaymentAdminModule, PaymentManagerModule],
})
export class PaymentModule {}
