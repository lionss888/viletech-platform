import { MigrationClass } from 'lib/modules/migration/migration.module';
import { ConfigurationPattern } from 'lib/enums/models/configuration.enums';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';

export class CreateConfiguration extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy) {
    super(client);
  }

  async up() {
    await this.client.send(ConfigurationPattern.CREATE, {
      openExchangeCorrectionPercent: 0.3,
      usdtCorrectionPercent: 1.4,
    });
  }
}
