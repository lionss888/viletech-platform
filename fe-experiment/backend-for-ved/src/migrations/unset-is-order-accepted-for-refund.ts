import { MigrationClass } from '../lib/modules/migration/migration.module';
import { FormPaymentPattern, FormPaymentStatus } from '../lib/enums/models/form-payment.enums';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';

export class UnsetIsOrderAcceptedForRefund extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy) {
    super(client);
  }

  async up() {
    const refundStatuses = [
      FormPaymentStatus.PAYMENT_REFUND_WAITING,
      FormPaymentStatus.PAYMENT_REFUND_PROCESSING,
      FormPaymentStatus.PAYMENT_REFUND_SENT,
    ];

    await this.client.send(FormPaymentPattern.UPDATE_MANY, {
      query: {
        statuses: refundStatuses,
      },
      update: {
        isOrderAccepted: false,
      },
    });
  }
}
