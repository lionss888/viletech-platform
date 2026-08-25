import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';

export class AddOrganizationIsActive extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    await this.connection
      .collection('organizations')
      .updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });
  }
}
