import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { IFormPayment } from '../lib/interfaces/models/form-payment.interface';

/**
 * Rename legacy currency.fixFee -> currency.fixFeeCurrency.
 *
 * The field stores the currency code of the fixed commission amount (feeFix).
 */
export class RenameFormPaymentFixFeeToFixFeeCurrency extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const formPaymentCollection = this.connection.collection<IFormPayment>('form-payments');

    await formPaymentCollection.updateMany(
      {
        'currency.fixFee': { $exists: true },
        'currency.fixFeeCurrency': { $exists: false },
      },
      {
        $rename: { 'currency.fixFee': 'currency.fixFeeCurrency' },
      },
    );
  }
}
