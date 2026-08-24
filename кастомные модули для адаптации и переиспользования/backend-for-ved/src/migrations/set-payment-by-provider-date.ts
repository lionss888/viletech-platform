import { FormPaymentCondition, FormPaymentStage } from 'lib/enums/models/form-payment.enums';
import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';

export class SetPaymentByProviderDate extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    await this.connection.collection('form-payments').updateMany(
      {
        paymentByProviderDate: { $exists: false },
        stage: {
          $in: [
            FormPaymentStage.AGENT_REPORT,
            FormPaymentStage.SHIPMENT,
            FormPaymentStage.COMPLETED,
            FormPaymentStage.ADVANCE_SIGNING_ORDER,
            FormPaymentStage.SENDING_PAYMENT_TO_CLIENT,
          ],
        },
      },
      [
        {
          $set: {
            paymentByProviderDate: '$updateDate',
          },
        },
        {
          $set: {
            moveToProviderDate: {
              $cond: {
                if: { $eq: ['$moveToProviderDate', null] },
                then: '$updateDate',
                else: '$moveToProviderDate',
              },
            },
          },
        },
      ],
    );

    await this.connection.collection('form-payments').updateMany(
      {
        paymentByProviderDate: { $exists: false },
        stage: {
          $in: [FormPaymentStage.WAITING_PAYMENT_FROM_CLIENT],
        },
        platformPaymentCondition: FormPaymentCondition.POST_PAYMENT,
      },
      [
        {
          $set: {
            paymentByProviderDate: '$updateDate',
          },
        },
        {
          $set: {
            moveToProviderDate: {
              $cond: {
                if: { $eq: ['$moveToProviderDate', null] },
                then: '$updateDate',
                else: '$moveToProviderDate',
              },
            },
          },
        },
      ],
    );
  }
}
