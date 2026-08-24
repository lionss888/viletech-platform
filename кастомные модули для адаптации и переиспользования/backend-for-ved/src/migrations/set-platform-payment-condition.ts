import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { IFormPayment } from '../lib/interfaces/models/form-payment.interface';
import { FormPaymentCondition, FormPaymentStatus } from '../lib/enums/models/form-payment.enums';

export class SetPlatformPaymentCondition extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const formPaymentCollection = this.connection.collection<IFormPayment>('form-payments');

    await formPaymentCollection.updateMany(
      {
        status: { $nin: [FormPaymentStatus.CREATING, FormPaymentStatus.DRAFT] },
        platformPaymentCondition: { $exists: false },
      },
      {
        $set: {
          platformPaymentCondition: FormPaymentCondition.ADVANCE,
        },
      },
    );
  }
}
