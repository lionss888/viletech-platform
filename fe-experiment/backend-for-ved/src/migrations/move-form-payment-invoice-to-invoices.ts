import { MigrationClass } from '../lib/modules/migration/migration.module';
import { Connection } from 'mongoose';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { v4 as uuidv4 } from 'uuid';

export class MoveFormPaymentInvoiceToInvoices extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    await this.connection.collection('form-payments').updateMany(
      {
        invoice: { $exists: true, $ne: null },
      },
      [
        {
          $set: {
            invoices: ['$invoice'],
          },
        },
        {
          $set: {
            'invoices.uuid': uuidv4(),
            'invoices.recognized': {
              counterparty: '$recognized.counterparty',
            },
            paymentRecognized: {
              paymentNumber: '$recognized.paymentNumber',
              paymentDate: '$recognized.paymentDate',
            },
          },
        },
        {
          $unset: ['invoice', 'recognized'],
        },
      ],
    );
  }
}
