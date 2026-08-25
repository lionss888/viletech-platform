import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { OrganizationStatus } from '../lib/enums/models/organization.enums';

export class AddOrganizationStatus extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    await this.connection.collection('organizations').updateMany(
      {},
      {
        $set: {
          status: OrganizationStatus.NOT_APPROVED,
        },
        $unset: {
          isConfirmed: true,
        },
      },
    );

    await this.connection.collection('form-payments').updateMany(
      {
        organization: { $exists: true },
      },
      {
        $set: {
          'organization.status': OrganizationStatus.NOT_APPROVED,
        },
        $unset: {
          'organization.isConfirmed': true,
        },
      },
    );
  }
}
