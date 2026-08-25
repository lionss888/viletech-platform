import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { FormPaymentStatus } from '../lib/enums/models/form-payment.enums';

export class SetFormPaymentIsSigningOrderSent extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const signingOrderStatuses = [
      FormPaymentStatus.SIGNING_ORDER,
      FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
      FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
      FormPaymentStatus.SIGNING_ORDER_VERIFICATION,
      FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    ];

    await this.connection.collection('form-payments').updateMany(
      {
        $or: [
          { status: { $in: signingOrderStatuses } },
          { signingOrderCreateDate: { $exists: true, $ne: null } },
          { isOrderAccepted: true },
        ],
      },
      {
        $set: {
          isSigningOrderSent: true,
        },
      },
    );
  }
}
