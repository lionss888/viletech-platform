import { MigrationClass } from '../lib/modules/migration/migration.module';
import { Connection } from 'mongoose';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';

export class ChangeFormPaymentRefundFieldType extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    await this.connection.collection('form-payments').updateMany({ 'docs.refund': { $exists: true, $ne: null } }, [
      {
        $set: {
          'docs.refund': {
            $cond: {
              if: { $not: { $isArray: '$docs.refund' } },
              then: ['$docs.refund'],
              else: '$docs.refund',
            },
          },
        },
      },
    ]);
  }
}
