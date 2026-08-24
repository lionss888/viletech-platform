import { Injectable, Logger } from '@nestjs/common';
import { MigrationClass } from 'lib/modules/migration/migration.module';
import { CounterpartyType } from 'lib/enums/models/counterparty.enums';

/**
 * Migration: Update counterparty indexes from clientOrganization to createdBy
 *
 * Fixes issue where old migration created indexes for clientOrganization,
 * but V-40 code uses createdBy for filtering.
 */
@Injectable()
export class UpdateCounterpartyIndexes extends MigrationClass {
  private readonly logger = new Logger(UpdateCounterpartyIndexes.name);

  async up() {
    this.logger.log('Starting counterparty indexes update...');

    const counterpartiesCollection = this.connection.collection('counterparties');

    // Get current indexes
    const existingIndexes = await counterpartiesCollection.indexes();
    this.logger.log(`Found ${existingIndexes.length} existing indexes`);

    // Check if old indexes exist (with clientOrganization)
    const hasOldIndexes = existingIndexes.some((idx) =>
      idx.name?.includes('clientOrganization') || JSON.stringify(idx.key).includes('clientOrganization'),
    );

    if (hasOldIndexes) {
      this.logger.log('Found old clientOrganization indexes. Removing...');

      // Drop old indexes
      try {
        await counterpartiesCollection.dropIndex('clientOrganization_1_isActive_1');
      } catch (error) {
        this.logger.warn('Failed to drop index clientOrganization_1_isActive_1 (may not exist)');
      }

      try {
        await counterpartiesCollection.dropIndex('clientOrganization_1_inn_1');
      } catch (error) {
        this.logger.warn('Failed to drop index clientOrganization_1_inn_1 (may not exist)');
      }

      try {
        await counterpartiesCollection.dropIndex('clientOrganization_1_name_1_country_1');
      } catch (error) {
        this.logger.warn('Failed to drop index clientOrganization_1_name_1_country_1 (may not exist)');
      }

      this.logger.log('Old indexes removed');
    } else {
      this.logger.log('No old clientOrganization indexes found');
    }

    // Create new indexes with createdBy (same as in counterparty.schema.ts)
    this.logger.log('Creating new indexes with createdBy...');

    try {
      await counterpartiesCollection.createIndex({ createdBy: 1, isActive: 1 });
      this.logger.log('✓ Created index: { createdBy: 1, isActive: 1 }');
    } catch (error) {
      this.logger.warn('Index { createdBy: 1, isActive: 1 } already exists or failed to create');
    }

    try {
      await counterpartiesCollection.createIndex(
        { createdBy: 1, inn: 1 },
        {
          unique: true,
          partialFilterExpression: { type: CounterpartyType.RUSSIAN },
        },
      );
      this.logger.log('✓ Created index: { createdBy: 1, inn: 1 } (unique, russian only)');
    } catch (error) {
      this.logger.warn('Index { createdBy: 1, inn: 1 } already exists or failed to create');
    }

    try {
      await counterpartiesCollection.createIndex(
        { createdBy: 1, name: 1, country: 1 },
        {
          unique: true,
          partialFilterExpression: { type: CounterpartyType.FOREIGN },
        },
      );
      this.logger.log('✓ Created index: { createdBy: 1, name: 1, country: 1 } (unique, foreign only)');
    } catch (error) {
      this.logger.warn('Index { createdBy: 1, name: 1, country: 1 } already exists or failed to create');
    }

    this.logger.log('Counterparty indexes updated successfully');

    // Note: This migration does NOT migrate data (clientOrganization → createdBy)
    // because counterparties should already have createdBy field set.
    // If you need data migration, add it here.
  }
}
