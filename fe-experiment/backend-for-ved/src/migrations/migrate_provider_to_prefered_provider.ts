import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';
import { AnyBulkWriteOperation, ObjectId } from 'mongodb';

export class MigrateProviderToPreferedProvider extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  formCollection = this.connection.collection('form-payments');
  organizationCollection = this.connection.collection('organizations');
  accountCollection = this.connection.collection('accounts');

  async up(): Promise<void> {
    const cursor = this.formCollection.aggregate<{
      _id: ObjectId;
      provider: ObjectId;
      orgExists: boolean;
      accExists: boolean;
    }>([
      {
        $match: {
          provider: { $exists: true, $ne: null },
          $or: [{ preferedProvider: { $exists: false } }, { preferedProvider: null }],
        },
      },
      {
        $lookup: {
          from: 'organizations',
          localField: 'provider',
          foreignField: '_id',
          as: 'org',
        },
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'provider',
          foreignField: '_id',
          as: 'acc',
        },
      },
      {
        $project: {
          _id: 1,
          provider: 1,
          orgExists: { $gt: [{ $size: '$org' }, 0] },
          accExists: { $gt: [{ $size: '$acc' }, 0] },
        },
      },
      {
        $match: {
          orgExists: true,
        },
      },
    ]);

    const bulk: AnyBulkWriteOperation[] = [];

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) continue;

      // Если provider указывал на аккаунт, не трогаем
      if (doc.accExists) {
        continue;
      }

      bulk.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: { preferedProvider: doc.provider },
            $unset: { provider: '' },
          },
        },
      });

      if (bulk.length >= 500) {
        await this.formCollection.bulkWrite(bulk);
        bulk.length = 0;
      }
    }

    if (bulk.length) {
      await this.formCollection.bulkWrite(bulk);
    }
  }

  async down(): Promise<void> {
    // no-op
  }
}
