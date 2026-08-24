import { MigrationClass } from '../lib/modules/migration/migration.module';
import { NatsClientProxy } from '../lib/modules/nats/nats-client-proxy';
import { Connection } from 'mongoose';

/**
 * VF-2: Миграция для добавления полей Diadoc в коллекции contracts и form-payments
 * Примечание: Поля опциональные, миграция только устанавливает значения по умолчанию
 */
export class AddDiadocFields extends MigrationClass {
  constructor(protected readonly client: NatsClientProxy, protected readonly connection: Connection) {
    super(client, connection);
  }

  async up() {
    // Устанавливаем signatureType = 'manual' для всех контрактов без этого поля
    await this.connection.collection('contracts').updateMany(
      { signatureType: { $exists: false } },
      {
        $set: {
          signatureType: 'manual',
        },
      },
    );

    console.log('VF-2: Diadoc fields migration completed - set default signatureType for contracts');
  }
}
