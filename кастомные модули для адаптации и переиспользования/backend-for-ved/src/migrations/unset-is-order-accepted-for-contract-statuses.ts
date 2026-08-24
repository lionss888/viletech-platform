import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { FormPaymentStatus } from '../lib/enums/models/form-payment.enums';

export class UnsetIsOrderAcceptedForContractStatuses extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const contractStatuses = [
      FormPaymentStatus.CONTRACT_WAITING,
      FormPaymentStatus.CONTRACT_WAITING_CORRECTION,
      FormPaymentStatus.CONTRACT_VERIFICATION,
    ];

    await this.connection.collection('form-payments').updateMany(
      { status: { $in: contractStatuses } },
      {
        $set: {
          isOrderAccepted: false,
        },
      },
    );
  }
}
