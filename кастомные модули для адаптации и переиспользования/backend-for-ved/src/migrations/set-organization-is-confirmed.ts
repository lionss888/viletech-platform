import { MigrationClass } from '../lib/modules/migration/migration.module';
import { FormPaymentPattern, FormPaymentStatus } from '../lib/enums/models/form-payment.enums';
import { OrganizationPattern } from '../lib/enums/models/organization.enums';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';

export class SetOrganizationIsConfirmed extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy) {
    super(client);
  }

  async up() {
    await this.client.send(FormPaymentPattern.UPDATE_MANY, {
      query: {
        notInStatuses: [
          FormPaymentStatus.COMPLETED,
          FormPaymentStatus.CANCELED_BY_USER,
          FormPaymentStatus.CANCELED_BY_MANAGER,
          FormPaymentStatus.CANCELED_BY_COMPLIANCE_OFFICER,
          FormPaymentStatus.CANCELED_BY_INTERNAL_COMPLIANCE_OFFICER,
          FormPaymentStatus.CREATING,
          FormPaymentStatus.DRAFT,
          FormPaymentStatus.FORM_WAITING_CORRECTIONS,
        ],
      },
      update: {
        isOrganizationConfirmed: false,
      },
    });

    await this.client.send(OrganizationPattern.UPDATE_MANY, {
      query: {},
      update: {
        isConfirmed: false,
      },
    });
  }
}
