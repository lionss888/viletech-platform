import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { IFormPayment } from '../lib/interfaces/models/form-payment.interface';
import { RateValueSource } from '../lib/enums/models/currency.enums';

/**
 * Backfill currency.fixFeeRateSource for existing form-payments.
 *
 * Historically currency.fixFeeRate could be set via manager patch endpoints without
 * storing an explicit source. Such rates are manual by definition.
 */
export class SetFormPaymentFixFeeRateSource extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const formPaymentCollection = this.connection.collection<IFormPayment>('form-payments');

    await formPaymentCollection.updateMany(
      {
        'currency.fixFeeRate': { $exists: true },
        'currency.fixFeeRateSource': { $exists: false },
      },
      {
        $set: { 'currency.fixFeeRateSource': RateValueSource.MANUAL },
      },
    );
  }
}
