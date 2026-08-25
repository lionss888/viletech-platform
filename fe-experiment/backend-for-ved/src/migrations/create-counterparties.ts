import { Injectable, Logger } from '@nestjs/common';
import { MigrationClass } from 'lib/modules/migration/migration.module';
import { CounterpartyType } from 'lib/enums/models/counterparty.enums';

@Injectable()
export class CreateCounterparties extends MigrationClass {
  private readonly logger = new Logger(CreateCounterparties.name);

  async up() {
    this.logger.log('Starting counterparties collection creation...');

    const counterpartiesCollection = this.connection.collection('counterparties');

    // Check if counterparties already exist
    const count = await counterpartiesCollection.countDocuments();

    if (count > 0) {
      this.logger.log(`Counterparties collection already exists with ${count} documents. Skipping migration.`);
      return;
    }

    // Create empty collection with indexes
    await counterpartiesCollection.createIndex({ createdBy: 1, isActive: 1 });
    await counterpartiesCollection.createIndex(
      { createdBy: 1, inn: 1 },
      { unique: true, partialFilterExpression: { type: CounterpartyType.RUSSIAN } },
    );
    await counterpartiesCollection.createIndex(
      { createdBy: 1, name: 1, country: 1 },
      { unique: true, partialFilterExpression: { type: CounterpartyType.FOREIGN } },
    );

    this.logger.log('Counterparties collection created with indexes');
  }
}
