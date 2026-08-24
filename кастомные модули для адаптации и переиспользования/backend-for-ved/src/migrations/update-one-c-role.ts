import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { IAccount } from '../lib/interfaces/models/account.interface';

export class UpdateOneCRole extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    const accountsCollection = this.connection.collection<IAccount>('accounts');

    const oneCAccounts = await accountsCollection.find({ roles: 'one_c_requester' as any }).toArray();
    const accountIds = oneCAccounts.map(({ _id }) => _id);

    await accountsCollection.updateMany(
      {
        _id: { $in: accountIds },
      },
      {
        $pull: { roles: 'one_c_requester' as any },
      },
    );

    await accountsCollection.updateMany(
      {
        _id: { $in: accountIds },
      },
      {
        $addToSet: { roles: 'one_c' as any },
      },
    );
  }
}
