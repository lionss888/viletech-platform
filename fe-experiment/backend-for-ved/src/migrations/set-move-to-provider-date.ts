import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';

export class SetMoveToProviderDate extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    await this.connection.collection('form-payments').updateMany(
      {
        paymentReceivedImportDate: { $exists: true, $ne: null },
      },
      [
        {
          $set: {
            moveToProviderDate: '$paymentReceivedImportDate',
          },
        },
        {
          $unset: ['paymentReceivedImportDate'],
        },
      ],
    );
  }
}
