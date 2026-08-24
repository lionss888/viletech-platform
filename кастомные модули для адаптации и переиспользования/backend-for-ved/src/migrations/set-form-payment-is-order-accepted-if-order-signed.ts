import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { IFormPayment } from '../lib/interfaces/models/form-payment.interface';
import { FormPaymentDirection, FormPaymentStatus } from '../lib/enums/models/form-payment.enums';

export class SetFormPaymentIsOrderAcceptedIfOrderSigned extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const formPaymentCollection = this.connection.collection<IFormPayment>('form-payments');

    const statusArray = Object.values(FormPaymentStatus);
    const signingOrderAcceptedIndex = statusArray.findIndex(
      (status) => status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    );
    const advanceSigningOrderAcceptedIndex = statusArray.findIndex(
      (status) => status === FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
    );

    if (signingOrderAcceptedIndex < 0 || advanceSigningOrderAcceptedIndex < 0) {
      return;
    }

    const contractStatuses = [
      FormPaymentStatus.CONTRACT_WAITING,
      FormPaymentStatus.CONTRACT_WAITING_CORRECTION,
      FormPaymentStatus.CONTRACT_VERIFICATION,
    ];

    const importAcceptedOrderStatuses = statusArray
      .slice(signingOrderAcceptedIndex, formPaymentCollection.length)
      .filter((status) => !contractStatuses.includes(status));
    const exportAcceptedOrderStatuses = statusArray
      .slice(advanceSigningOrderAcceptedIndex, formPaymentCollection.length)
      .filter((status) => !contractStatuses.includes(status));

    await formPaymentCollection.updateMany(
      {
        direction: FormPaymentDirection.IMPORT,
        status: { $in: importAcceptedOrderStatuses },
      },
      {
        $set: {
          isOrderAccepted: true,
        },
      },
    );

    await formPaymentCollection.updateMany(
      {
        direction: FormPaymentDirection.EXPORT,
        status: { $in: exportAcceptedOrderStatuses },
      },
      {
        $set: {
          isOrderAccepted: true,
        },
      },
    );
  }
}
