import { MigrationClass } from 'lib/modules/migration/migration.module';
import { AccountPattern } from 'lib/enums/models/account.enums';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';

export class CreateAdmin extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy) {
    super(client);
  }

  async up() {
    await this.client.send(AccountPattern.CREATE_ADMIN, {});
  }
}
