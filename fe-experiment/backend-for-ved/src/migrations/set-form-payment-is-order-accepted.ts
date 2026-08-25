import { MigrationClass } from '../lib/modules/migration/migration.module';
import { FormPaymentPattern, FormPaymentStatus } from '../lib/enums/models/form-payment.enums';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';

export class SetFormPaymentIsOrderAccepted extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy) {
    super(client);
  }

  async up() {
    const statusArray = Object.values(FormPaymentStatus);

    const signingOrderAcceptedIndex = statusArray.findIndex(
      (status) => status === FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
    );
    const advanceSigningOrderAcceptedIndex = statusArray.findIndex(
      (status) => status === FormPaymentStatus.ADVANCE_SIGNING_ORDER_ACCEPTED,
    );
    const completedStatusIndex = statusArray.findIndex((status) => status === FormPaymentStatus.COMPLETED);

    if (signingOrderAcceptedIndex < 0 || completedStatusIndex < 0 || advanceSigningOrderAcceptedIndex < 0) {
      return;
    }

    const importAcceptedOrderStatuses = statusArray.slice(signingOrderAcceptedIndex, completedStatusIndex);
    const exportAcceptedOrderStatuses = statusArray.slice(advanceSigningOrderAcceptedIndex, completedStatusIndex);

    await this.client.send(FormPaymentPattern.UPDATE_MANY, {
      query: {
        forImportByStatuses: importAcceptedOrderStatuses,
        forExportByStatuses: exportAcceptedOrderStatuses,
      },
      update: {
        isOrderAccepted: true,
      },
    });
  }
}
