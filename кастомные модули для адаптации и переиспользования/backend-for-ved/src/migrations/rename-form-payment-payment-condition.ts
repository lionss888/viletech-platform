import { MigrationClass } from '../lib/modules/migration/migration.module';
import { Connection } from 'mongoose';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';

export class RenameFormPaymentPaymentCondition extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    await this.connection
      .collection('form-payments')
      .updateMany(
        { paymentCondition: { $exists: true } },
        { $rename: { paymentCondition: 'counterpartyPaymentCondition' } },
      );
  }
}
